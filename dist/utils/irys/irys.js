import { Uploader } from "@irys/upload";
import Solana from "@irys/upload-solana";
import fs from "fs";
import mime from 'mime-types';
const uploaderKeypair = JSON.parse(fs.readFileSync("./files/PQUAS24P1LDvfcutgYNJjMg2QczT5oa9mjWWvNatevp.json", "utf-8"));
const IRYS_RPC_URL = "https://wispy-capable-thunder.solana-mainnet.quiknode.pro/9f3c459141d958c685c017f56244e5ba3c8c1dee/";
const getIrysUploader = async () => {
    const irysUploader = await Uploader(Solana).withWallet(uploaderKeypair).mainnet().withRpc(IRYS_RPC_URL);
    return irysUploader;
};
const irys = await getIrysUploader();
export async function uploadFile(file) {
    const fileToUpload = file;
    const fileType = mime.lookup(fileToUpload) || 'image/webp';
    const { size } = fs.statSync(fileToUpload);
    const tags = [{ name: 'Content-Type', value: fileType }];
    const price = await irys.getPrice(size);
    const balance = await irys.getBalance();
    if (price > balance) {
        console.log(`Insufficient balance ${price} , ${balance} , ${Number(price) - Number(balance)} `);
        const fund = await irys.fund(30 * 1000);
        // return;
    }
    const newUploadedData = await irys.uploadFile(fileToUpload, { tags: tags });
    let newUrl = `https://uploader.irys.xyz/${newUploadedData.id}`;
    console.log(file, newUrl);
    return newUrl;
}
