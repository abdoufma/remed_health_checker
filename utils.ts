import { promisify } from "util";
import { exec as originalExec } from "child_process";

const sleep = (ms : number) => new Promise(resolve => setTimeout(resolve, ms));

export const timeLog = (msg) => console.log(`[${(new Date()).toLocaleTimeString('fr-fr')}] ${msg}`);

export function printProgress(progress){
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(progress + '%');
}

async function restartProcess(STOP_COMMAND, START_COMMAND){
    try {
        const exec = promisify(originalExec);
        const {stdout, stderr} = await exec(STOP_COMMAND);
        console.log(`Server stopped successfully`);
        await sleep(2000);
        try {
            const { stdout, stderr } = await exec(START_COMMAND);
            console.log(`Server started successfully`);
        } catch (err) {
            console.error(`Error starting server: ${err.message}`);
        }
    } catch (err) {
        console.error(`Error restarting server: ${err.message}`);
    }
}

export const restartService = (service) => restartProcess(`nssm stop ${service}`, `nssm start ${service}`);
export const restartNodeServer = (server) => restartProcess(`pm2 stop ${server}`, `pm2 start ${server}`);

console.log(process.argv);