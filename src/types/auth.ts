
// tipler - dtolar ->> LoginInput, RegisterInput vs.


export type ISODate = string;
export interface LoginInput {
    email: string;
    password: string;
    platform?: string;
}

export interface RegisterInput {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    acceptedTos: boolean;
    platform?: string;
}

export interface CorporateRegisterInput {
    // Required fields - company_name (min 2 chars)
    companyName: string;

    // Required fields - tax_office (min 2 chars)
    taxOffice: string;

    // Required fields - vkn (10 digits, numbers only)
    vkn: string;

    // Required fields - city (min 2 chars)
    city: string;

    // Required fields - district (min 2 chars)
    district: string;

    // Required fields - first_name
    firstName: string;

    // Required fields - last_name
    lastName: string;

    // Required fields - email
    email: string;

    // Required fields - phone (min 7 digits)
    phone: string;

    // Required fields - password (min 6 chars)
    password: string;

    // Form only - password confirmation
    passwordConfirm: string;

    // Optional address fields
    neighborhood?: string;
    street?: string;
    buildingNumber?: string;
    apartmentNumber?: string;
    floor?: string;
    postalCode?: string;

    // Consents
    acceptedTos: boolean;
    acceptedKvkk: boolean;
    platform?: string;
}

export interface CorporateRegisterResponse {
    userId: string;
    companyId: string;
    status: string;  // PASSIVE_NO_PAYMENT (initial status)
    accessToken: string;
    refreshToken: string;
}

export interface MockResult<T> {
    ok: true;
    endpoint: string;
    payload: T;
    createdAt: ISODate;
    json: string;
}

export type Role = "admin" | "dealer" | "carrier" | "restaurant";
