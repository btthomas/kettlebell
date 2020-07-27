const puppeteer = require('puppeteer');
const { user, password } = require('./secrets.json');

const showBrowser = !!process.argv[2];
const options = showBrowser
  ? {
      headless: false,
      slowMo: 1,
      executablePath:
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }
  : {};

const LOGIN_URL = 'https://www.kettlebellkings.com/login.php';
const STOCK_URL = 'https://www.kettlebellkings.com/competition-kettlebell/';
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

    await page.goto(LOGIN_URL);
    response = await login(page);
    if (response.error) {
      throw new Error(response.error);
    }

    await page.goto(STOCK_URL);
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
    await page.click('#login_email');
    await page.keyboard.type(user);

    await page.click('#login_pass');
    await page.keyboard.type(password);

    const navigate = page.waitForNavigation({
      waitUntil: 'networkidle0',
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
      await inform({ twelve, sixteen });
    }

    debugger;
    return {};
  } catch (error) {
    return { error };
  }
}

async function inform({ twelve, sixteen }) {
  console.log({ twelve, sixteen });
}

init();
