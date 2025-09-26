import { toSendableSubPackage } from "../uiEndpoints/package";
import { toSendableTest } from "../uiEndpoints/tests";
import { getAllSubPackages, getAllTests } from "../utils/cache/cache";
const popularSearchTests = {
    317: 5,
    380: 5,
    383: 5,
    9: 5,
    196: 5,
};
const frequentlyBookedTests = {
    317: 5,
    380: 5,
    383: 5,
    9: 5,
    196: 5,
};
const popularSearchPackages = {
    3: 5,
    6: 5,
    7: 5,
    15: 5,
    17: 5,
};
const frequentlyBookedPackages = {
    3: 5,
    6: 5,
    7: 5,
    15: 5,
    17: 5,
};
export const filterTests = async (query) => {
    const q = query.toLowerCase();
    const allTests = await getAllTests();
    // score each test for better ranking
    const scored = allTests
        .map((t) => {
        const name = String(t?.name ?? "");
        const slug = String(t?.slug ?? "");
        const idStr = String(t?.testId ?? "");
        const nameL = name.toLowerCase();
        const slugL = slug.toLowerCase();
        const idL = idStr.toLowerCase();
        let score = 0;
        // exact matches
        if (idL === q)
            score = 100;
        else if (nameL === q)
            score = 90;
        else if (slugL === q)
            score = 85;
        // prefix matches
        else if (nameL.startsWith(q))
            score = 75;
        else if (slugL.startsWith(q))
            score = 70;
        else if (idL.startsWith(q))
            score = 68;
        // substring matches
        else if (nameL.includes(q))
            score = 60;
        else if (slugL.includes(q))
            score = 55;
        else if (idL.includes(q))
            score = 50;
        return { test: t, score, name };
    })
        .filter((r) => r.score > 0);
    // sort by score, then by shorter name
    scored.sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return a.name.length - b.name.length;
    });
    // only top 30
    const limitedTests = scored.slice(0, 30).map(({ test }) => toSendableTest(test));
    return limitedTests;
};
export const filterPackages = async (query) => {
    const q = query.toLowerCase();
    const allPackages = await getAllSubPackages();
    // score each package for better ranking
    const scored = allPackages
        .map((p) => {
        const name = String(p?.name ?? "");
        const slug = String(p?.slug ?? "");
        const idStr = String(p?.packageId ?? "");
        const nameL = name.toLowerCase();
        const slugL = slug.toLowerCase();
        const idL = idStr.toLowerCase();
        let score = 0;
        // exact matches
        if (idL === q)
            score = 100;
        else if (nameL === q)
            score = 90;
        else if (slugL === q)
            score = 85;
        // prefix matches
        else if (nameL.startsWith(q))
            score = 75;
        else if (slugL.startsWith(q))
            score = 70;
        else if (idL.startsWith(q))
            score = 68;
        // substring matches
        else if (nameL.includes(q))
            score = 60;
        else if (slugL.includes(q))
            score = 55;
        else if (idL.includes(q))
            score = 50;
        return { package: p, score, name };
    })
        .filter((r) => r.score > 0);
    // sort by score, then by shorter name
    scored.sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        return a.name.length - b.name.length;
    });
    // only top 30
    const limitedPackages = scored.slice(0, 30).map(({ package: pkg }) => toSendableSubPackage(pkg));
    return limitedPackages;
};
export const popularSearchTestsList = async () => {
    const allTests = await getAllTests();
    const testMap = new Map();
    for (const test of allTests) {
        testMap.set(test.testId, test);
    }
    const results = Object.entries(popularSearchTests)
        .sort((a, b) => b[1] - a[1]) // ✅ sort by search count descending
        .map(([id]) => testMap.get(Number(id)))
        .filter(Boolean)
        .map((test) => toSendableTest(test));
    return results;
};
export const frequentlyBookedTestsList = async () => {
    const allTests = await getAllTests();
    const testMap = new Map();
    for (const test of allTests) {
        testMap.set(test.testId, test);
    }
    const results = Object.entries(popularSearchTests)
        .sort((a, b) => b[1] - a[1]) // ✅ sort by search count descending
        .map(([id]) => testMap.get(Number(id)))
        .filter(Boolean)
        .map((test) => toSendableTest(test));
    return results;
};
export const popularSearchPackagesList = async () => {
    const allPackages = await getAllSubPackages();
    const packageMap = new Map();
    for (const pkg of allPackages) {
        packageMap.set(pkg.packageId, pkg);
    }
    const results = Object.entries(popularSearchPackages)
        .sort((a, b) => b[1] - a[1]) // ✅ sort by search count descending
        .map(([id]) => packageMap.get(Number(id)))
        .filter(Boolean)
        .map((pkg) => toSendableSubPackage(pkg));
    return results;
};
export const frequentlyBookedPackagesList = async () => {
    const allPackages = await getAllSubPackages();
    const packageMap = new Map();
    for (const pkg of allPackages) {
        packageMap.set(pkg.packageId, pkg);
    }
    const results = Object.entries(frequentlyBookedPackages)
        .sort((a, b) => b[1] - a[1]) // ✅ sort by search count descending
        .map(([id]) => packageMap.get(Number(id)))
        .filter(Boolean)
        .map((pkg) => toSendableSubPackage(pkg));
    return results;
};
