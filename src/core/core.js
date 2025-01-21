import { API } from "./api/api.js";
import logger from "../utils/logger.js";
import { Config } from "../../config/config.js";
import { ethers } from "ethers";
import { questionList } from "./question_list.js";
import { Helper } from "../utils/helper.js";

export default class Core extends API {
  constructor(proxy) {
    super(proxy);
    this.provider = new ethers.JsonRpcProvider(
      "https://base.llamarpc.com",
      8453
    );
  }

  async connectWallet() {
    try {
      logger.info(`Connecting to wallet address using provided Private Key`);
      this.wallet = new ethers.Wallet(Config.PRIVATEKEY.trim(), this.provider);
      if (!this.wallet)
        throw Error(
          "Invalid Private Key, Check your config.js, make sure you use EVM Private Key"
        );

      this.address = this.wallet.address;
      logger.info(`Wallet connected ${JSON.stringify(this.address)}\n`);
    } catch (error) {
      throw error;
    }
  }
  async connectGaia() {
    try {
      logger.info(`Connecting to Gaia Net`);
      const msg = JSON.stringify({
        wallet_address: this.address,
        timestamp: Date.now(),
      });
      const signedMessage = await this.wallet.signMessage(msg);
      const res = await this.fetch(
        "https://api.gaianet.ai/api/v1/users/connect-wallet/",
        "POST",
        undefined,
        {
          signature: signedMessage,
          message: JSON.parse(msg),
        }
      );

      this.userId = res.data.user_id;
      this.token = res.data.access_token;
      this.apiKey = res.data.api_key;
      logger.info(
        `Connected to Gaia Net\n - User ID : ${this.userId}\n - API KEY : ${this.apiKey}\n `
      );
    } catch (error) {
      throw error;
    }
  }

  async getNodes() {
    try {
      logger.info(`Getting Node List Of Current Account`);

      const res = await this.fetch(
        "https://api.gaianet.ai/api/v1/users/nodes/",
        "GET",
        this.token
      );

      this.nodes = res.data.objects;
      logger.info(`User Nodes List :`);
      this.nodes.map((item) => {
        return logger.info(
          `- Node URL : ${item.subdomain}\n  Status : ${item.status}\n  ThroughPut : ${item.throughputs}\n`
        );
      });
    } catch (error) {
      throw error;
    }
  }

  async startSession(node) {
    try {
      logger.info(`Starting New Chat Session for Node ${node.subdomain}`);
      const initialChat =
        questionList[Helper.random(0, questionList.length - 1)];
      this.currentChat = {
        model: "Llama-3.2-3B-Instruct",
        messages: [
          {
            role: "system",
            content:
              "You are a tour guide in Paris, France. Please answer the question from a Paris visitor accurately.",
          },
          {
            role: "user",
            content: initialChat,
          },
        ],
        stream: false,
        user: this.userId,
      };
      logger.info(`Sending Chat to ${node.subdomain}`);
      logger.info(`Message : ${initialChat}`);
      logger.info(`Waiting for ${node.subdomain} to response\n`);

      const res = await this.fetch(
        `https://${node.subdomain}/v1/chat/completions`,
        `POST`,
        `Bearer ${this.apiKey}`,
        this.currentChat
      );
      logger.info(
        `Response from ${node.subdomain} : ${res.choices[0].message.content}\n`
      );
      this.currentChat.messages.push({
        content: res.choices[0].message.content,
        role: "assistant",
      });
    } catch (error) {
      throw error;
    }
  }
  async continueSession(node, msg) {
    try {
      logger.info(`Sending Chat to ${node.subdomain}`);
      logger.info(`Message : ${msg}`);
      this.currentChat.messages.push({
        content: msg,
        role: "user",
      });
      logger.info(`Waiting for ${node.subdomain} to response\n`);

      const res = await this.fetch(
        `https://${node.subdomain}/v1/chat/completions`,
        `POST`,
        `Bearer ${this.apiKey}`,
        this.currentChat
      );
      logger.info(
        `Response from ${node.subdomain} : ${res.choices[0].message.content}`
      );
      this.currentChat.messages.push({
        content: res.choices[0].message.content,
        role: "assistant",
      });
    } catch (error) {
      throw error;
    }
  }
}
