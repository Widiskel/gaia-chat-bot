import { Config } from "./config/config.js";
import Core from "./src/core/core.js";
import { questionList } from "./src/core/question_list.js";
import { Helper } from "./src/utils/helper.js";
import logger from "./src/utils/logger.js";

async function operation() {
  const core = new Core(
    Config.PROXYLIST[Helper.random(Config.PROXYLIST.length - 1)]
  );
  try {
    await core.connectWallet();
    await core.connectGaia();

    await core.getNodes();
    const promiseList = [];

    for (const item of core.nodes) {
      if (item.status == "ONLINE") {
        const promise = (async () => {
          while (true) {
            logger.info(``);
            await core.startSession(item);
            await core.continueSession(
              item,
              questionList[Helper.random(0, questionList.length - 1)]
            );
            logger.info(``);
          }
        })();
        promiseList.push(promise);
      } else {
        logger.info(`Node ${item.subdomain} is ${item.status} SKIPPING`);
      }
    }

    await Promise.all(promiseList);
  } catch (error) {
    let msg = `Error : `;
    msg += error.message;
    logger.error(msg);

    if (Helper.errorIs(error, 204)) {
      throw Error(`${msg}, Check your token`);
    }

    logger.info(`Retrying in 5 seconds...`);
    await Helper.delay(5000);
    await operation();
  }
}

async function startBot() {
  try {
    logger.info(`BOT STARTED\n`);
    await operation();
  } catch (error) {
    logger.info(`BOT STOPPED`);
    logger.error(JSON.stringify(error));
    throw error;
  }
}

(async () => {
  try {
    logger.clear();
    logger.info("Application Started");
    logger.info(`${Helper.botName} BOT`);
    logger.info();
    logger.info("By : Widiskel");
    logger.info("Follow On : https://github.com/Widiskel");
    logger.info("Join Channel : https://t.me/skeldrophunt");
    logger.info("Don't forget to run git pull to keep up to date");
    logger.info();
    logger.info();
    Helper.showSkelLogo();

    await startBot();
  } catch (error) {
    logger.info("Error during execution", error);
    await startBot();
  }
})();
