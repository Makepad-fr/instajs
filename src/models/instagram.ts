import puppeteer from 'puppeteer';
import Options from './options';
import fs from 'fs';
import { Selectors } from './selectors';

export default class Instagram {
    private baseURL: string = 'https://instagram.com';
    private config: Options | undefined;
    private browser: puppeteer.Browser | undefined;
    private page: puppeteer.Page;
    private cookiesFilePath: string;

    private constructor(
        config: Options,
        browser: puppeteer.Browser,
        page: puppeteer.Page,
        cookiesFileName: string,
    ) {
        this.config = config;
        this.browser = browser;
        this.page = page;
        this.cookiesFilePath = cookiesFileName;
    }

    public static async init(
        options: Options,
        cookiesFilePath: string = 'instajs_cookies.json',
    ): Promise<Instagram> {
        const browserOptions: (puppeteer.LaunchOptions & puppeteer.BrowserLaunchArgumentOptions & puppeteer.BrowserConnectOptions) | undefined = {
        headless: options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sendbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      };
  
      if (process.arch === 'arm' || process.arch === 'arm64') {
        // If processor architecture is arm or arm64 we need to use chromium browser
        browserOptions.executablePath = 'chromium-browser';
      }
      const browser = await puppeteer.launch(browserOptions);
      /**
       * We need an incognito browser to avoid notification
       * and location permissions of Facebook
       *
       */
      const incognitoContext = await browser.createIncognitoBrowserContext();
      // Creates a new borwser tab
      const page = await incognitoContext.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3419.0 Safari/537.36');
  
      if (options.useCookies && fs.existsSync(cookiesFilePath)) {
        const cookiesString = fs.readFileSync(cookiesFilePath);
        const cookies = JSON.parse(cookiesString.toString());
        await page.setCookie(...cookies);
      }
      return new Instagram(options, browser, page, cookiesFilePath);
    }

    public async login(username: string, password: string) {
        await this.page.goto(this.baseURL);
        if (this.config?.useCookies && fs.existsSync(this.cookiesFilePath)) {
            return;
        }
        await this.submitPopupDialog();
        await this.page.waitForXPath(Selectors.USERNAME_INPUT);
        let loginFormElement = await this.page.$x(Selectors.USERNAME_INPUT);
        await loginFormElement[0]?.focus();
        await this.page.keyboard.type(username);
        await this.page.waitForXPath(Selectors.PASSWORD_INPUT);
        loginFormElement = await this.page.$x(Selectors.PASSWORD_INPUT);
        await loginFormElement[0]?.focus();
        await this.page.keyboard.type(password);
        await this.page.keyboard.press('Enter');
        await this.page.waitForNavigation();
        await this.page.waitForXPath(Selectors.BUTTON_TYPED_BUTTON);
        await (await this.page.$x(Selectors.BUTTON_TYPED_BUTTON))[0]?.click();
        await this.submitPopupDialog();
        await this.saveCookies();
    }

    private async checkForPopupDialog(): Promise<boolean> {
        await this.page.waitForXPath(Selectors.POPUP_DIALOG);
        const acceptCookieDialog = await this.page.$x(Selectors.POPUP_DIALOG);
        return acceptCookieDialog.length !== 0;
    }

    private async acceptPopupDialog(): Promise<void> {
        await this.page.waitForXPath(Selectors.FIRST_BUTTON_ON_POPUP_DIALOG);
        const acceptAllButton = await this.page.$x(Selectors.FIRST_BUTTON_ON_POPUP_DIALOG);
        await acceptAllButton[0]?.click();
    }

    private async saveCookies(): Promise<void> {
        if (this.config?.useCookies) {
            const cookies = await this.page.cookies();
            if (this.cookiesFilePath === undefined) {
                this.cookiesFilePath = 'fbjs_cookies';
            }
            fs.writeFileSync(`./${this.cookiesFilePath.replace(/\.json$/g, '')}.json`, JSON.stringify(cookies, null, 2));
        }
    }

    private async submitPopupDialog(): Promise<void> {
        if (await this.checkForPopupDialog()) {
            await this.acceptPopupDialog();
        }
    }
}