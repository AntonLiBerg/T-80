# How To Run The SSH Server

1. Setup environment
   Install Node.js and npm, then confirm they are available:
   ```bash
   node -v
   npm -v
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Generate a local host key
   Keep the private key local and uncommitted.
   ```bash
   ssh-keygen -t ed25519 -f host.key -N ""
   ```

4. Start the server
   ```bash
   npm run dev
   ```
   You should see `SSH server listening on port 2222`.

5. Connect to the server
   In another terminal:
   ```bash
   ssh -p 2222 test@127.0.0.1
   ```
   Password: `test`

6. Stop the server
   Press `Ctrl+C` in the server terminal.
