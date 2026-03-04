import {KvpRow} from "./types"

const UIWIDTH = 120;
const UIHEIGHT = 30;
const ROWMIDDLE = Math.floor(UIWIDTH / 2);




export function makeUI(entries: KvpRow[]) : string {
   let ascii = makeAsciiRow(0,"=".repeat(UIWIDTH))
   + makeAsciiRow(ROWMIDDLE - 7,"SSH SECRET VAULT")
   + makeAsciiRow(0,"=".repeat(UIWIDTH))
   + makeAsciiRow(0,"")
   + makeAsciiRow(
      1,
      formatKvpLine({
         id: "ID",
         key: "KEY",
         value: "VALUE",
         createdAt: "CREATED_AT",
         updatedAt: "UPDATED_AT",
      }),
   );

   for (const entry of entries) {
      ascii += makeAsciiRow(
         1,
         formatKvpLine({
            id: String(entry.id),
            key: entry.key,
            value: entry.value,
            createdAt: formatTimestamp(entry.created_at),
            updatedAt: formatTimestamp(entry.updated_at),
         }),
      );
   }

   if (entries.length === 0) {
      ascii += makeAsciiRow(1, "(kvps table is empty)");
   }

   const rowsBeforePadding = 5 + Math.max(entries.length, 1);
   const blankRows = Math.max(0, UIHEIGHT - rowsBeforePadding - 1);
   for(let i = 0;i<blankRows; i++){
      ascii += makeAsciiRow(0,"")
   }
   ascii += makeAsciiRow(0,"=".repeat(UIWIDTH))
   ascii += makeAsciiRow(0,"Write command and press enter to perform:")
   ascii += makeAsciiRow(1,"-  [add key value]: add new kvp to the vault")
   ascii += makeAsciiRow(0,"")

   return ascii
}

function makeAsciiRow(colStart:number,text:string){
   const safeColStart = Math.max(0, colStart);
   const padding = Math.max(0, UIWIDTH - safeColStart - text.length);
   return " ".repeat(safeColStart)+text+" ".repeat(padding)+"\n";
}

function formatColumn(input: string, width: number): string {
   const normalized = input.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
   return normalized.length >= width ? normalized : normalized.padEnd(width, " ");
}

function formatTimestamp(input: Date | string): string {
   if (input instanceof Date) {
      return input.toISOString();
   }
   const parsed = new Date(input);
   if (Number.isNaN(parsed.getTime())) {
      return String(input);
   }
   return parsed.toISOString();
}

function formatKvpLine(entry: {
   id: string;
   key: string;
   value: string;
   createdAt: string;
   updatedAt: string;
}): string {
   return [
      formatColumn(entry.id, 6),
      formatColumn(entry.key, 20),
      formatColumn(entry.value, 26),
      formatColumn(entry.createdAt, 28),
      formatColumn(entry.updatedAt, 28),
   ].join(" ");
}

