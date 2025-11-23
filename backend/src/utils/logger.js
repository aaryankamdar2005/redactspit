const config = require('../config/config');

class Logger {
  info(message, ...args) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  debug(message, ...args) {
    if (config.nodeEnv === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  // For Morgan integration
  get stream() {
    return {
      write: (message) => {
        this.info(message.trim());
      }
    };
  }
}

module.exports = new Logger();
