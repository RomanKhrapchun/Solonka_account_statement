const tasksService = require('../service/tasks-service');
const Logger = require('../../../utils/logger');

class tasksController {
    constructor() {
        // Прив'язуємо методи до контексту для правильної роботи this
        this.processDebtorRegister = this.processDebtorRegister.bind(this);
        this.sendEmail = this.sendEmail.bind(this);
        this.updateDatabaseCheck = this.updateDatabaseCheck.bind(this);
        this.previewDatabaseUpdate = this.previewDatabaseUpdate.bind(this);
        this.updateDatabaseExecute = this.updateDatabaseExecute.bind(this);
    }

    /**
     * Отримати community_name з request або .env
     */
    getCommunityName(request, source = 'body') {
        // Спочатку шукаємо в request
        const communityNameFromRequest = source === 'query'
            ? request.query?.community_name
            : request.body?.community_name;

        // Перевіряємо що значення існує і не є 'default'
        if (communityNameFromRequest && communityNameFromRequest !== 'default') {
            return communityNameFromRequest;
        }

        // Якщо в request немає або прийшов 'default', шукаємо в .env
        const communityNameFromEnv = process.env.COMMUNITY_NAME;

        // Перевіряємо що значення в .env існує і не є 'default'
        if (communityNameFromEnv && communityNameFromEnv !== 'default') {
            Logger.info('Використано COMMUNITY_NAME з .env файлу', {
                communityName: communityNameFromEnv
            });
            return communityNameFromEnv;
        }

        // Якщо нічого не знайдено або всюди 'default', повертаємо null
        return null;
    }
    /**
     * POST /api/taskss/process-register
     * Обробити реєстр боржників та отримати контрольні суми
     */
    async processDebtorRegister(request, reply) {
        try {
            const community_name = this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано community_name (ні в запиті, ні в .env)'
                });
            }

            Logger.info('Запит на обробку реєстру', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.processDebtorRegister(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в processDebtorRegister', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * POST /api/taskss/send-email
     * Відправити email з результатами
     */
    async sendEmail(request, reply) {
        try {
            const community_name = this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано community_name (ні в запиті, ні в .env)'
                });
            }

            Logger.info('Запит на відправку email', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.sendEmail(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в sendEmail', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Email може бути відправлено пізніше.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * POST /api/taskss/update-database-check
     * Отримати контрольні суми для оновлення бази даних
     */
    async updateDatabaseCheck(request, reply) {
        try {
            const community_name = this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано community_name (ні в запиті, ні в .env)'
                });
            }

            Logger.info('Запит на перевірку оновлення бази даних', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.updateDatabaseCheck(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в updateDatabaseCheck', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * GET /api/taskss/database/preview
     * Отримати попередній перегляд даних з віддаленої БД
     */
    async previewDatabaseUpdate(request, reply) {
        try {
            const community_name = this.getCommunityName(request, 'query');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано community_name (ні в запиті, ні в .env)'
                });
            }

            Logger.info('Запит попереднього перегляду оновлення БД', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Отримуємо статистику з віддаленої БД
            const result = await tasksService.previewDatabaseUpdate(community_name);

            return reply.status(200).send(result);

        } catch (error) {
            Logger.error('Помилка в previewDatabaseUpdate', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Спробуйте ще раз.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }

    /**
     * POST /api/taskss/update-database-execute
     * Виконати оновлення локальної бази даних
     */
    async updateDatabaseExecute(request, reply) {
        try {
            const community_name = this.getCommunityName(request, 'body');

            if (!community_name) {
                return reply.status(400).send({
                    success: false,
                    error: 'Не вказано community_name (ні в запиті, ні в .env)'
                });
            }

            Logger.info('Запит на виконання оновлення бази даних', {
                communityName: community_name,
                userId: request?.user?.id
            });

            // Відправляємо завдання та чекаємо на результат
            const result = await tasksService.updateDatabaseExecute(community_name);

            return reply.status(200).send({
                success: true,
                data: result
            });

        } catch (error) {
            Logger.error('Помилка в updateDatabaseExecute', {
                error: error.message,
                stack: error.stack
            });

            // Перевіряємо чи це timeout
            if (error.message.includes('Timeout')) {
                return reply.status(408).send({
                    success: false,
                    error: 'Час очікування вичерпано. Оновлення може виконуватись у фоні.'
                });
            }

            return reply.status(500).send({
                success: false,
                error: error.message || 'Внутрішня помилка сервера'
            });
        }
    }
}

module.exports = new tasksController();