const program = require('commander');
const fs = require('fs');
const chalkPipe = require('chalk-pipe');
const inquirer = require('inquirer');
const loadJsonFile = require('load-json-file');
const mkdirp = require('mkdirp');

const dirs = path => fs.readdirSync(path)
  .filter(file => fs.statSync(`${path}/${file}`).isDirectory());

const questionPath = (path) => {
  const files = dirs(path);

  return inquirer.prompt([{
    type: 'list',
    name: 'dir',
    choices: files,
  }]).then(({ dir }) => {
    const nextPath = `${path}/${dir}`;

    if (dirs(nextPath).length) {
      return inquirer.prompt([{
        type: 'confirm',
        name: 'next',
        message: 'Next step setup path?',
      }]).then(({ next }) => {
        if (next) {
          return questionPath(nextPath);
        } else {
          return nextPath;
        }
      });
    } else {
      return nextPath;
    }
  });
};

const selectFilesDir = path => {
  return fs.readdirSync(path).length
    ? inquirer.prompt([{
      type: 'checkbox',
      name: 'files',
      message: 'Select copy files',
      choices: fs.readdirSync(path),
      validate: (value) => {
        if (value.length) {
          return true;
        }

        return 'Select file/s!';
      },
    }])
    : new Promise((res, req) => {
      req();
    });
};

const consoleDirEmpty = () => console.log(chalkPipe('red')('Directory is empty!'));

const cloneDir = (fromPath, toPath, params = {}) => {
  const { fileCallback } = params;

  if (!fs.existsSync(toPath)) {
    fs.mkdirSync(toPath);
  }

  fs.readdirSync(fromPath).forEach((fileName) => {
    const fromPathFile = `${fromPath}/${fileName}`;
    const toPathFile = `${toPath}/${fileName}`;

    if (fs.statSync(fromPathFile).isDirectory()) {
      cloneDir(fromPathFile, toPathFile, params);
    } else {
      const file = fs.readFileSync(fromPathFile);
      let fileStr = file.toString();

      if (fileCallback instanceof Function) {
        fileStr = fileCallback({
          fileStr,
          file,
          fromPathFile,
          toPathFile,
        });
      }

      fs.writeFileSync(toPathFile, fileStr);
    }
  });
};

program
  .command('create')
  .option('-t, --template [template]', 'Path to template', './')
  .option('-c, --config [config]', 'Path to config', './cli.config.json')
  .option('-s, --storage [storage]', 'Path to templates storage', './store-templates')
  .option('-n, --name [nameTemplate]', 'Name template')
  .description('run create by template functional area')
  .action((cmd) => {
    const rootPath = process.cwd();
    let config = {};

    try {
      config = loadJsonFile.sync(`${rootPath}/${cmd.config}`);
    } catch(e) {
      // pass
    }

    console.log('@config', chalkPipe('cyan')(JSON.stringify(config)));

    if (config.template) {
      selectFilesDir(config.template).then(({ files }) => {
        const storage = config.storage || cmd.storage;
        const name = config.name || cmd.nameTemplate;

        mkdirp.sync(`${rootPath}/${storage}`);

        if (name) {
          console.log(name);
        } else {
          inquirer.prompt([{
            type: 'input',
            name: 'nameTemplate',
            choices: files,
          }]).then(({ nameTemplate }) => {
            console.log(nameTemplate);
          });
        }

      }, consoleDirEmpty);
    } else if (cmd.template !== './') {
      selectFilesDir(cmd.template).then(() => {}, consoleDirEmpty);
    } else {
      questionPath(rootPath).then((template) => {
        selectFilesDir(template).then(() => {}, consoleDirEmpty);
      });
    }
  });

program.command('setup')
  .option('-p', '--path [path]', 'Path to file with sessings (*.json)')
  .description('setup global sessings')
  .action(() => {
    console.log('@setup');
  });

program.version('0.0.1').parse(process.argv);
