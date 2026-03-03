import { getApiUrl } from './config';

// 1. Definição do contrato de resposta do teu Backend FastAPI
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message: string;
    error?: string | null;
}

// 2. Erro customizado para capturar status HTTP e mensagens da API
export class ApiError extends Error {
    constructor(public status: number, message: string, public data?: any) {
        super(message);
        this.name = 'ApiError';
    }
}

// 3. Helper para recuperar o Token da sessão armazenada
const getAuthToken = (): string | null => {
    const session = localStorage.getItem('rotina-inteligente-session');
    if (session) {
        try {
            const parsed = JSON.parse(session);
            return parsed.token || null;
        } catch {
            return null;
        }
    }
    return null;
};

// 4. Tratamento centralizado de respostas
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    // Se o status for 401 (Não Autorizado), limpamos a sessão e mandamos para o login
    if (response.status === 401) {
        localStorage.removeItem('rotina-inteligente-session');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new ApiError(401, 'Sessão expirada. Por favor, faça login novamente.');
    }

    if (!response.ok) {
        // Tenta extrair a mensagem de erro do backend (FastAPI costuma usar 'detail' ou 'message')
        const errorMessage = data?.message || data?.detail || `Erro ${response.status}: ${response.statusText}`;
        throw new ApiError(response.status, errorMessage, data);
    }

    return data as ApiResponse<T>;
};

// 5. Objeto Cliente com os métodos HTTP
export const apiClient = {
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        const response = await fetch(getApiUrl(endpoint), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });
        return handleResponse<T>(response);
    },

    async post<T, B = unknown>(endpoint: string, body?: B, includeAuth: boolean = true): Promise<ApiResponse<T>> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (includeAuth) {
            const token = getAuthToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(getApiUrl(endpoint), {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    async put<T, B = unknown>(endpoint: string, body?: B): Promise<ApiResponse<T>> {
        const response = await fetch(getApiUrl(endpoint), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        const response = await fetch(getApiUrl(endpoint), {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });
        return handleResponse<T>(response);
    },

    async patch<T, B = unknown>(endpoint: string, body?: B): Promise<ApiResponse<T>> {
        const response = await fetch(getApiUrl(endpoint), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },
};