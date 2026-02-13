import { readFileSync } from "node:fs";
import { Server, type Session } from "ssh2";

const SESSION_NR_MAX = 50;
const SESSION_IDLE_MAX_MS = 60*10*1000;
const UIWidth = 30;
const UIHeight = 30;
const emptyUI = 

`=
                     VIM-IRO
==================================================

`;
interface State  {
  cUI_z0: string,
  cUI_z1: string,
  displayed: Set<string>
}
const state :State = {
    cUI_z0: emptyUI as string,
    cUI_z1: "" as string,
    displayed: new Set<string>
}
const hostKey = readFileSync("./host.key");
let sessions = new Set<Session>()

// Setup the server and accept only those with the correct login
new Server({ hostKeys: [hostKey] }, (client) => {
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
            stream.write(state.cUI);
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

function displayPopup(text: string,state:State){ 
   const displayId = "popup center"
   if(state.displayed.has(displayId))
      throw new Error("already displayed!")
   state.cUI_z1 = overwriteAt(state.cUI_z1,   
}

function overwriteAt(str: string, index: number, text: string): string {
   return str.slice(0, index) + text + str.slice(index + text.length);
}

