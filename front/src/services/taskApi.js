// services/taskApi.js
import { fetchFunction } from "../utils/function";

/**
 * Відправити завдання на обробку реєстру боржників
 * Повертає контрольні суми синхронно
 */
export const processDebtorRegister = async (communityName) => {
    try {
        const response = await fetchFunction('/api/task/process-register', {
            method: 'POST',
            data: {
                community_name: communityName
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Помилка обробки реєстру');
        }

        return response.data.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Відправити email з результатами
 */
export const sendEmailTask = async (communityName) => {
    try {
        const response = await fetchFunction('/api/task/send-email', {
            method: 'POST',
            data: {
                community_name: communityName
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Помилка відправки email');
        }

        return response.data.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Отримати попередній перегляд даних з віддаленої БД (статистика)
 */
export const previewDatabaseUpdate = async (communityName) => {
    try {
        const response = await fetchFunction(`/api/task/database/preview?community_name=${encodeURIComponent(communityName)}`, {
            method: 'GET'
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Помилка отримання попереднього перегляду');
        }

        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Отримати контрольні суми для оновлення бази даних
 */
export const updateDatabaseCheck = async (communityName) => {
    try {
        const response = await fetchFunction('/api/task/update-database-check', {
            method: 'POST',
            data: {
                community_name: communityName
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Помилка перевірки оновлення БД');
        }

        return response.data.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Виконати оновлення локальної бази даних
 */
export const updateDatabaseExecute = async (communityName) => {
    try {
        const response = await fetchFunction('/api/task/update-database-execute', {
            method: 'POST',
            data: {
                community_name: communityName
            }
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Помилка оновлення БД');
        }

        return response.data.data;
    } catch (error) {
        throw error;
    }
};