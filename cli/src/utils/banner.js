import chalk from "chalk";

export function printBanner() {
  console.log(
    chalk.bold.cyan(`
 ███████╗███████╗ ██████╗██╗   ██╗██████╗ ███████╗
 ██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝
 ███████╗█████╗  ██║     ██║   ██║██████╔╝█████╗  
 ╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██╔══╝  
 ███████║███████╗╚██████╗╚██████╔╝██║  ██║███████╗
 ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
`)
  );
  console.log(chalk.dim(" SDLC Agents — Security at every step of the build\n"));
}

export function printPhase(phase, description) {
  const phases = {
    PLAN:    chalk.bgBlue.white,
    DESIGN:  chalk.bgMagenta.white,
    BUILD:   chalk.bgYellow.black,
    TEST:    chalk.bgCyan.black,
    RELEASE: chalk.bgGreen.black,
  };
  const colorFn = phases[phase] || chalk.bgGray.white;
  console.log(`\n${colorFn(` ${phase} `)} ${chalk.bold(description)}\n`);
}

export function printSuccess(msg) {
  console.log(chalk.green(`✓ ${msg}`));
}

export function printWarn(msg) {
  console.log(chalk.yellow(`⚠ ${msg}`));
}

export function printError(msg) {
  console.log(chalk.red(`✗ ${msg}`));
}

export function printInfo(msg) {
  console.log(chalk.dim(`  ${msg}`));
}
