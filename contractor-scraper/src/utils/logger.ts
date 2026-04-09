const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp(): string {
  return new Date().toISOString();
}

const logger = {
  info(message: string, ...args: unknown[]): void {
    console.log(`${colors.blue}[INFO]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  success(message: string, ...args: unknown[]): void {
    console.log(`${colors.green}[OK]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  error(message: string, ...args: unknown[]): void {
    console.error(`${colors.red}[ERROR]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${message}`, ...args);
  },

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      console.log(`${colors.gray}[DEBUG] ${timestamp()} ${message}${colors.reset}`, ...args);
    }
  },
};

export default logger;
