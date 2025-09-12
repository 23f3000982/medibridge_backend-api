export interface AdminUser {
    adminId: number;
    username: string;
    name: string;
    profileImage?: string;
    status: "online" | "offline" | "away";
    allowed: string[]; // e.g., ['test', 'package']
    email?: string;
}

export interface LoginRequestBody {
    username?: string;
    password?: string;
    token?: string;
}

export type Image = {
    imageId: number;
    name: string;
    link: string;
    hash: string;
    height: number;
    width: number;
    size: number; // in KB
    format: string; // e.g., 'webp', 'jpeg'
    blurHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type Department = {
    departmentId: number;
    name: string;
    deptCode: string;
    image: string;
    imageHash?: string;
    description?: string;
    totalTests: number; // Number of tests in this department
}

export type SampleType = {
    sampleId: number;
    name: string;
    icon: string;
}

export type Parameter = {
    parameterId: number;
    name: string;
    parameterCode: string;
}

export type Test = {
    testId: number;
    name: string;
    slug: string;
    basePrice: number;
    crelioId: number;
    departmentCode: string; // deptCode
    tat: number; // Turnaround time in hours
    sampleId: string; // sampleId
    modelImage: string;
    icon: string;
    description?: string;
    fastingRequired: boolean;
    parameters: string[]; // Array of associated parameters codes
    createdAt: Date;
    updatedAt: Date;
}


export type Packages = {
    packageId: number;
    name: string;
    slug: string;
    title: string;
    description?: string;
    icon: string;
    modelImage: string;
    subPackages?: SubPackage[]; // Array of associated sub-packages
}

export type SubPackage = {
    subPackageId: number;
    packageId: number;
    name: string;
    title: string;
    slug: string;
    crelioId: number;
    price: number;
    tat: number;
    description?: string;
    icon: string;
    modelImage: string;
    testIds: number[]; // Array of associated testIds
}

export type HomeBanner = {
    bannerId: number;
    phoneImage: string;
    desktopImage: string;
    redirectUrl: string;
    title: string;
    description?: string;
}

export type CollectionCenter = {
    id: number;
    link: string;
    name: string;
    address: string;
    contact: string;
}