const readline = require("readline");
const path = require("path");
const fs = require("fs");
const { execSync, spawnSync, spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const tokenize = (line) => {
  const args = [];
  let currentArg = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;
  let hasArg = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (isEscaped) {
      currentArg += char;
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      if (inSingleQuote) {
        currentArg += char;
      } else if (inDoubleQuote) {
        const nextChar = line[i + 1];
        if (nextChar && ['\\', '"', '$', '\n', '`'].includes(nextChar)) {
          isEscaped = true;
        } else {
          currentArg += char;
        }
      } else {
        isEscaped = true;
      }
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      hasArg = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      hasArg = true;
      continue;
    }

    if ((char === " " || char === "\t") && !inSingleQuote && !inDoubleQuote) {
      if (hasArg) {
        args.push(currentArg);
        currentArg = "";
        hasArg = false;
      }
      continue;
    }

    currentArg += char;
    hasArg = true;
  }

  if (hasArg) {
    args.push(currentArg);
  }
  // console.log(args);
  return args;
};

const handleRedirect = (args) => {
  let operatorIndex = args.findIndex((arg) => arg === ">" || arg === "1>");
  let outputFile = args[operatorIndex + 1];
  try{
    const output = execSync(args.slice(0, operatorIndex).join(" "), { encoding: 'utf-8' });
    fs.writeFileSync(outputFile, output, { encoding: 'utf-8' });
  }
  catch (error){
    if (error.stdout) {
			fs.writeFileSync(outputFile, error.stdout.toString())
		} else {
			fs.writeFileSync(outputFile, '')
		}
  }
}

const handleStderr = (args) => {
  let operatorIndex = args.findIndex((arg) => arg === "2>");
  let outputFile = args[operatorIndex + 1];
  try {
    const output = execSync(args.slice(0, operatorIndex).join(" "), { encoding: 'utf-8' });
  }
  catch(error){
    if (error.stdout) {
      fs.writeFileSync(outputFile, error.stdout.toString());
    }
    else {
      fs.writeFileSync(outputFile, '');
    }
  }
}
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
  if (dir == "~") {
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
    const parts = tokenize(answer);

    if (parts.length === 0) {
      ask();
      return;
    }
    const command = parts[0];
    const args = parts.slice(1);
    if (parts.includes('>') || parts.includes('1>')) {
      handleRedirect(parts);
      ask();
    }
    else if (parts.includes('2>')) {
      handleStderr(parts);
      ask();
    }
    else if (commandBuiltin[command]) {
      commandBuiltin[command](args);
      ask();
    }
    else {
      handleExecuteCommand(parts, ask);
    }
  });
}

ask();



