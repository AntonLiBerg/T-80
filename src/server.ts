import { readFileSync } from "node:fs";
import { Server } from "ssh2";

const hostKey = readFileSync("./host.key");

new Server({ hostKeys: [hostKey] }, (client) => {
  client.on("authentication", (ctx) => {
    if (ctx.method === "password" && ctx.username === "test" && ctx.password === "test") {
      ctx.accept();
    } else {
      ctx.reject();
    }
  });

  client.on("ready", () => {
    client.on("session", (accept) => {
      const session = accept();
      session.on("shell", (accept) => {
        const stream = accept();
        stream.write("Welcome!\r\n");
        stream.on("data", (data: Buffer) => {
          stream.write(data);
        });
      });
    });
  });
})
  .listen(2222, "0.0.0.0", () => {
    console.log("SSH server listening on port 2222");
  });


