const readline = require("readline");
const path = require("path");
const fs = require("fs");
const spawn = require("child_process").spawn;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// const handleCommandNotFound = (command) => {
//     console.log(`${command}: command not found`);
// }

const handleExit = () => {
  rl.close();
  process.exit(0);
}

const handleEcho = (args) => {
  console.log(args.join(" "));
}

const findExecutablePath = (args) => {
  pathENV = process.env.PATH;
  const directories = pathENV.split(path.delimiter);
  for (const directory of directories) {
    const filePath = path.join(directory, args);
    try {
      fs.accessSync(filePath, fs.constants.X_OK);
      return filePath;
    }
    catch {
      //nothing
    }
  }
  return null;
}

const handleType = (args) => {
  if (commandBuiltin[args[0]]) {
    console.log(`${args[0]} is a shell builtin`);
  }
  else { //command is not a builtin
    execPath = findExecutablePath(args[0]);
    if (execPath) {
      console.log(`${args[0]} is ${execPath}`);
      return;
    }
    console.log(`${args[0]}: not found`);
  }
}

const handlePwd = () => {
  console.log(process.cwd());
}

const handleCd = (args) => {
  if (args.length === 0) {
    console.log("cd: missing operand");
    return;
  }

  let dir = args[0];
  if(dir == "~") {
    dir = process.env.HOME;
  }
  try {
    fs.accessSync(dir, fs.constants.F_OK);
    process.chdir(dir);
  }
  catch {
    console.log(`cd: ${dir}: No such file or directory`);
  }
}

const handleExecuteCommand = (args, onDone) => {
  const execPath = findExecutablePath(args[0]);
  if (!execPath) {
    console.log(`${args[0]}: command not found`);
    onDone();
    return;
  }
  const child = spawn(execPath, args.slice(1), {
    stdio: "inherit",
    shell: false,
    argv0: args[0],
  });

  child.on("error", (err) => {
    console.error(`Error: ${err.message}`);
    onDone();
  });

  child.on("close", (code) => {
    onDone();
  });
}
const commandBuiltin = {
  exit: handleExit,
  echo: handleEcho,
  type: handleType,
  pwd: handlePwd,
  cd: handleCd,
}

const ask = () => {
  rl.question("$ ", (answer) => {
    const parts = answer.split(" ").filter(p => p !== "");
    if (parts.length === 0) {
      ask();
      return;
    }
    const command = parts[0];
    const args = parts.slice(1);
    if (commandBuiltin[command]) {
      commandBuiltin[command](args);
      ask();
    }
    else {
      handleExecuteCommand(parts, ask);
    }
  });
}

ask();



