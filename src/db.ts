import { KvpRow } from "./types";
import * as pg from "pg";

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
export async function addKvp(args:string[]): Promise<boolean>{
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
export async function getKvps(): Promise<KvpRow[]>{
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
