import axios from 'axios';

import type { AxiosResponse } from 'axios';

import type { Country } from '@/interfaces/country';

interface CountryByCodeResponse {
  name: string;
  alpha2Code: string;
  alpha3Code: string;
}

const apiClient = axios.create({
  baseURL: 'https://restcountries.com/v3.1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Error response:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default {
  async getCountries(): Promise<AxiosResponse<Country[]>> {
    return await apiClient.get<Country[]>('/all?fields=name,population,region,capital,flags');
  },

  async getCountryByName(name: string | string[]): Promise<AxiosResponse<Country[]>> {
    return await apiClient.get<Country[]>(`/name/${name}`);
  },

  async getCountryByCode(code: string): Promise<AxiosResponse<CountryByCodeResponse>> {
    return await apiClient.get<CountryByCodeResponse>(`/alpha/${code}`);
  },
};
