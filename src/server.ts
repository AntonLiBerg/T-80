import { readFileSync } from "node:fs";
import { KvpRow } from "./types";
import { Server, type Session } from "ssh2";
import { makeUI } from "./ascii"
import * as pg from "pg";

const SESSION_NR_MAX = 50;
const SESSION_IDLE_MAX_MS = 60*10*1000;


const hostKey = readFileSync("./host.key");
let sessions = new Set<Session>()


// Setup the server and accept only those with the correct login
new Server({ hostKeys: [hostKey] }, (client) => {
   client.on("error", (err: NodeJS.ErrnoException & { level?: string }) => {
      // Common when a TCP client disconnects before completing the SSH handshake.
      if (err.code === "ECONNRESET") {
         return;
      }
      console.error("SSH client error:", err);
   });

   client.on("authentication",(ctx) => {
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
            stream.write("Loading..\n");
            void getKvps()
               .then((rows) => {
                  stream.write(makeUI(rows));
               });

               stream.on("data", async (data: Buffer) => {
                  try{
                     resetIdleTimer();
                     const normalized = data.toString().trim();
                     if (!normalized) {
                        return;
                     }
                     const split = normalized.split(/\s+/);
                     const cmd = split[0];
                     const args = split.slice(1);
                     const cmdStrMsg = `${cmd} with args: ${args.join(",")}`
                     stream.write("trying command: " + cmdStrMsg + "\n")

                     const handler = cmd ? commands[cmd] : undefined
                     if (!handler) {
                        stream.write("command "+cmd+" not found!\n")
                        return;
                     }

                     const isOk = await handler(args)
                     if(isOk){
                        stream.write("succesfully ran: "+cmdStrMsg + "\n")
                        const rows = await getKvps()
                        stream.write(makeUI(rows))
                     }
                     else
                        stream.write("command failed: "+cmdStrMsg + "\n")
                  }catch(err){
                     stream.write("internal error!\n")
                  }
               });
         });
      });
   });
})
.listen(2222, "0.0.0.0", () => {
   console.log("SSH server listening on port 2222");
});


const commands: Record<string, (args: string[]) => Promise<boolean>> = {
   add: addKvp,
}

const db = new pg.Client({
   host: process.env.PGHOST ?? "localhost",
   port: Number(process.env.PGPORT ?? "5432"),
   database: process.env.PGDATABASE ?? "t80",
   user: process.env.PGUSER ?? "t80",
   password: process.env.PGPASSWORD ?? "t80dev",
})

let dbReady: Promise<void> | null = null;
function ensureDbConnected(): Promise<void> {
   if (!dbReady) dbReady = db.connect();
   return dbReady;
}
async function addKvp(args:string[]): Promise<boolean>{
   try{
      await ensureDbConnected()
      const key = args[0]
      const val = args[1]
      if (!key || !val) {
         return false;
      }
      await db.query(`
                     INSERT INTO kvps (key,value)
                     VALUES($1,$2)
                     `,[key,val]);
                     return true;
   }
   catch(e){
      return false;
   }
}
async function getKvps(): Promise<KvpRow[]>{
   try{
      await ensureDbConnected()
      const res = await db.query<KvpRow>(`
         SELECT id, key, value, created_at, updated_at
         FROM kvps
         ORDER BY id ASC
      `)
      return res.rows

   }catch(err){
      return []
   }
}
