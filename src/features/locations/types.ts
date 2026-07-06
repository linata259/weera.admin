export interface County {
    id: string;
    name: string;
    created_at?: string | null;
}

export interface SubCounty {
    id: string;
    county_id: string;
    name: string;
    created_at?: string | null;
}

export interface Ward {
    id: string;
    subcounty_id: string;
    name: string;
    created_at?: string | null;
}
