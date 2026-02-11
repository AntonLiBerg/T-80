"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const ssh2_1 = require("ssh2");
const SESSION_NR_MAX = 50;
const SESSION_IDLE_MAX_MS = 60 * 10 * 1000;
const hostKey = (0, node_fs_1.readFileSync)("./host.key");
let sessions = new Set();
// Setup the server and accept only those with the correct login
new ssh2_1.Server({ hostKeys: [hostKey] }, (client) => {
    client.on("authentication", (ctx) => {
        if (ctx.method === "password" && ctx.username === "test" && ctx.password === "test") {
            ctx.accept();
        }
        else {
            ctx.reject();
        }
    });
    //Setup the session
    client.on("ready", () => {
        client.on("session", (accept, reject) => {
            if (sessions.size >= SESSION_NR_MAX) {
                reject();
                return;
            }
            const session = accept();
            sessions.add(session);
            // Remove sessions where the user is idle for too long
            let idleTimer;
            const resetIdleTimer = () => {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    session.close();
                }, SESSION_IDLE_MAX_MS);
            };
            // Cleanup when the session closes
            const cleanup = () => {
                clearTimeout(idleTimer);
                sessions.delete(session);
            };
            session.on("close", cleanup);
            session.on("end", cleanup);
            session.on("error", cleanup);
            //Start accepting traffic
            resetIdleTimer();
            session.on("shell", (accept) => {
                const stream = accept();
                resetIdleTimer();
                stream.write(emptyUI);
                stream.on("data", (data) => {
                    resetIdleTimer();
                });
            });
        });
    });
})
    .listen(2222, "0.0.0.0", () => {
    console.log("SSH server listening on port 2222");
});
const emptyUI = `==================================================
                     VIM-IRO
==================================================

`;
//# sourceMappingURL=server.js.map