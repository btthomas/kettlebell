const puppeteer = require('puppeteer');
const { user, password } = require('./secrets.json');

const showBrowser = !!process.argv[2];
const options = showBrowser
  ? {
      headless: false,
      slowMo: 20,
      // executablePath:
      // '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }
  : {};

const LOGIN_URL = 'https://www.kettlebellkings.com/login.php';
const STOCK_URL = 'https://www.kettlebellkings.com/competition-kettlebell/';
const IFRAME_OVERLAY = '#attentive_overlay';
const SELECT_SELECTOR = '#attribute_select_888';
const OPTIONS_SELECTOR = '#attribute_select_888 > option';

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const getTextContent = (el) => el.textContent;

const getTextFromHandles = async (page, handles) => {
  let text = [];
  await asyncForEach(handles, async (handle, index) => {
    if (index === 0) {
      return;
    }
    text[index - 1] = await page.evaluate(getTextContent, handle);
  });
  return text;
};

async function init() {
  const browser = await puppeteer.launch(options);

  try {
    let response;
    const page = await browser.newPage();

    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    response = await login(page);
    if (response.error) {
      throw new Error(response.error);
    }

    await page.goto(STOCK_URL, { waitUntil: 'networkidle2' });
    response = await checkStock(page);
    if (response.error) {
      throw new Error(response.error);
    }

    await browser.close();
  } catch (e) {
    console.error(e);
  }
}

async function login(page) {
  try {
    await page.waitForSelector(IFRAME_OVERLAY);
    await page.$eval(IFRAME_OVERLAY, (overlay) => {
      overlay.remove();
    });

    await page.waitForSelector('#login_email');
    await page.click('#login_email');
    await page.keyboard.type(user);

    await page.click('#login_pass');
    await page.keyboard.type(password);

    const navigate = page.waitForNavigation({
      waitUntil: 'networkidle2',
    });
    page.click(
      'body > div.body > div.container > div > div > form > div.form-actions > input'
    );
    await navigate;
    return {};
  } catch (error) {
    return { error };
  }
}

async function checkStock(page) {
  try {
    await page.waitForSelector(SELECT_SELECTOR);
    const options = await page.$$(OPTIONS_SELECTOR);
    const optionsText = await getTextFromHandles(page, options);
    const inStock = optionsText.map((text) => !text.includes('Out of Stock'));

    const twelve = inStock[2];
    const sixteen = inStock[4];

    if (twelve || sixteen) {
      await inform();
    }
    if (twelve) {
      await addTwelveToCart(page);
    }
    if (sixteen) {
      await addSixteenToCart(page);
    }

    debugger;
    return {};
  } catch (error) {
    return { error };
  }
}

async function inform() {
  console.log('text?');
}
async function addTwelveToCart(page) {}
async function addSixteenToCart(page) {}

init();
