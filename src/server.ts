import { readFileSync } from "node:fs";
import { Server, type Session } from "ssh2";

const SESSION_NR_MAX = 50;
const SESSION_IDLE_MAX_MS = 60*10*1000;
const UIWIDTH = 60;
const UIHEIGHT = 30;
const ROWMIDDLE = 30;
type VaultEntry = {
   key: string;
   value: string;
};

const hostKey = readFileSync("./host.key");
let sessions = new Set<Session>()
const vaultEntries: VaultEntry[] = [
   { key: "MyTestPassword", value: "passWOrd1234" },
   { key: "MyOtherTestPassword", value: "passWOrd1234" },
   { key: "MyFirstTestPassword", value: "passWOrd1234" },
];

// Setup the server and accept only those with the correct login
new Server({ hostKeys: [hostKey] }, (client) => {
   client.on("error", (err: NodeJS.ErrnoException & { level?: string }) => {
      // Common when a TCP client disconnects before completing the SSH handshake.
      if (err.code === "ECONNRESET") {
         return;
      }
      console.error("SSH client error:", err);
   });

   client.on("authentication", (ctx) => {
      if (ctx.method === "password" && ctx.username === "test" && ctx.password === "test") {
         ctx.accept();
      } else {
         ctx.reject();
      }
   });

   //Setup the session
   client.on("ready", () => {
      client.on("session", (accept,reject) => {
         if(sessions.size >= SESSION_NR_MAX){
            reject();
            return;
         }
         const session = accept();
         sessions.add(session);

         // Remove sessions where the user is idle for too long
         let idleTimer: NodeJS.Timeout
         const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
               session.close();
            }, SESSION_IDLE_MAX_MS);
         };

         // Cleanup when the session closes
         const cleanup = ()=>{ 
            clearTimeout(idleTimer);
            sessions.delete(session);
         }
         session.on("close", cleanup)
         session.on("end",cleanup)
         session.on("error",cleanup)

         //Start accepting traffic
         resetIdleTimer();
         session.on("shell", (accept) => {
            const stream = accept();
            resetIdleTimer();
            stream.write(makeUI(vaultEntries));
            stream.on("data", (data: Buffer) => {
               resetIdleTimer();

            });
         });
      });
   });
})
.listen(2222, "0.0.0.0", () => {
   console.log("SSH server listening on port 2222");
});


function makeAsciiRow(colStart:number,text:string){
   const safeColStart = Math.max(0, colStart);
   const padding = Math.max(0, UIWIDTH - safeColStart - text.length);
   return " ".repeat(safeColStart)+text+" ".repeat(padding)+"\n";
}

function makeUI(entries: VaultEntry[]) : string {
   let ascii = makeAsciiRow(0,"=".repeat(UIWIDTH))
   + makeAsciiRow(ROWMIDDLE - 7,"SSH SECRET VAULT")
   + makeAsciiRow(0,"=".repeat(UIWIDTH))
   + makeAsciiRow(0,"")
   + makeAsciiRow(5,"Key                  Value");

   for (const entry of entries) {
      ascii += makeAsciiRow(5, `${entry.key.padEnd(20, " ")} ${entry.value}`);
   }

   const rowsBeforePadding = 5 + entries.length;
   const blankRows = Math.max(0, UIHEIGHT - rowsBeforePadding - 1);
   for(let i = 0;i<blankRows; i++){
      ascii += makeAsciiRow(0,"")
   }
   ascii += makeAsciiRow(0,"=".repeat(UIWIDTH))
   return ascii
}
