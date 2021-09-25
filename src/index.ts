import Instagram from "./models/instagram";

async function main() {
    const instagram = await Instagram.init({
        headless: false,
        debug: true,
        useCookies: true,
        disableAssets: false,
        output: './out'
    }, './instajs_cookies.json');
    await instagram.login(process.env["INSTAGRAM_USERNAME"]!, process.env['INSTAGRAM_PASSWORD']!);
}

main().then();