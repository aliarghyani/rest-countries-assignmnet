// apiService.ts

import axios from 'axios';

import store from './store';

import type { AxiosResponse } from 'axios';

// Define interfaces for the expected API responses
interface Country {
  name: {
    common: string;
    official: string;
    nativeName?: Record<string, { common: string; official: string }>;
  };
  flags: {
    png: string;
    alt: string;
  };
  capital: string[];
  region: string;
  subregion: string;
  population: number;
  tld: string;
  languages: Record<string, string>;
  currencies: Record<string, { name: string; symbol: string }>;
  borders: string[];
}


interface CountryByCodeResponse {
  name: string;
  alpha2Code: string;
  alpha3Code: string;
  // Add additional fields based on the expected response structure
}

// Create an Axios instance
const apiClient = axios.create({
  baseURL: 'https://restcountries.com/v3.1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // timeout: 5000,
});


// Adding response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Error response:', error.response || error.message);
    return Promise.reject(error);
  }
);

// Exporting the API service
export default {
  // APIs
  async getCountries(): Promise<AxiosResponse<Country[]>> {
    return await apiClient.get<Country[]>('/all?fields=name,population,region,capital,flags');
  },

  async getCountryByName(name: string|string[]): Promise<AxiosResponse<Country[]>> {
    return await apiClient.get<Country[]>(`/name/${name}`);
  },

  async getCountryByCode(code: string): Promise<AxiosResponse<CountryByCodeResponse>> {
    return await apiClient.get<CountryByCodeResponse>(`/alpha/${code}`);
  },
};
