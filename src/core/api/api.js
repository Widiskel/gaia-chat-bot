import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import { Helper } from "../../utils/helper.js";
import logger from "../../utils/logger.js";

export class API {
  constructor(proxy) {
    this.proxy = proxy;
    this.ua = Helper.randomUserAgent();
  }

  generateHeaders(token = undefined) {
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Site": "same-site",
      "Sec-Fetch-Mode": "cors",
      "User-Agent": this.ua,
    };

    if (token) {
      headers["Authorization"] = token;
    }

    return headers;
  }

  async fetch(endpoint, method, token, body = {}, additionalHeader = {}) {
    const url = endpoint;
    try {
      const headers = {
        ...this.generateHeaders(token),
        ...additionalHeader,
      };
      const options = {
        headers,
        method,
      };

      logger.debug(`${method} : ${url} ${this.proxy ? this.proxy : ""}`);
      logger.debug(`Request Header : ${JSON.stringify(options.headers)}`);

      if (method !== "GET") {
        options.body = `${JSON.stringify(body)}`;
        logger.debug(`Request Body : ${options.body}`);
      }

      if (this.proxy) {
        options.agent = new HttpsProxyAgent(this.proxy, {
          rejectUnauthorized: false,
        });
      }
      const res = await fetch(url, options);
      logger.debug(`Response : ${res.status} ${res.statusText}`);

      if (res.ok && res.status != 204) {
        const contentType = res.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
          data.status = res.status;
        } else {
          data = {
            status: res.status,
            message: await res.text(),
          };
        }

        if (res.ok) data.status = 200;
        let responseData = JSON.stringify(data);
        logger.debug(`Response Data : ${responseData}`);
        return data;
      } else {
        throw res;
      }
    } catch (err) {
      if (err.status) {
        throw Error(`${err.status} - ${err.statusText}`);
      }
      throw Error(`${err.message}`);
    }
  }
}
