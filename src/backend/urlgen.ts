import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Read the word list from the file
const wordListPath = path.join("backend", 'wordlist.txt');
const wordList = fs.readFileSync(wordListPath, 'utf-8').split('\n').map(word => word.trim());

// Function to generate a unique ID and map it to three words
export function generateUniqueId(log:object, timestamp:number): string {
    // Generate a unique ID

    const uniqueId = JSON.stringify(log) + timestamp;

    // Create an MD5 hash of the unique ID
    const hash = crypto.createHash('sha256').update(uniqueId).digest('hex');

    // Convert the hash to a number
    const uniqueNumber = BigInt('0x' + hash);

    // Map the number to three words from the word list
    const word1 = wordList[Number(uniqueNumber % BigInt(wordList.length))];
    const word2 = wordList[Number((uniqueNumber >> BigInt(64)) % BigInt(wordList.length))];
    const word3 = wordList[Number((uniqueNumber >> BigInt(128)) % BigInt(wordList.length))];

    return `${word1}-${word2}-${word3}`;
}