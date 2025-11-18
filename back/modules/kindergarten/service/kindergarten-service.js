const KindergartenRepository = require("../repository/kindergarten-repository");
const { paginate, paginationData } = require("../../../utils/function");
const logRepository = require('../../log/repository/log-repository');

class KindergartenService {

    async getDebtByDebtorId(request) {
        const userData = await KindergartenRepository.findDebtorById(request.params?.id)
        return userData[0];
    }

    async findDebtByFilter(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body;
        const { offset } = paginate(page, limit);
        const userData = await KindergartenRepository.findDebtByFilter(limit, offset, whereConditions);
        return paginationData(userData[0], page, limit);
    }

    async generateWordByDebtId(request, reply) {
        const userData = await KindergartenRepository.generateWordByDebtId(request, reply)
        return userData;
    }

    async printDebtId(request, reply) {
        const userData = await KindergartenRepository.printDebtId(request, reply)
        return userData;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ГРУП САДОЧКА
    // ===============================

    async findGroupsByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'id', 
            sort_direction = 'desc',
            kindergarten_name,  // ✅ ДОДАНО: витягуємо з request
            group_name,
            group_type,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Логування пошуку якщо є хоча б один фільтр
        // ✅ ЗМІНЕНО: додано kindergarten_name до умови
        if (kindergarten_name || group_name || group_type) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук груп садочку',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_groups',
                oid: '16505',
            });
        }

        // ✅ ЗМІНЕНО: додано передачу kindergarten_name до Repository
        const userData = await KindergartenRepository.findGroupsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            kindergarten_name,  // ✅ ДОДАНО
            group_name,
            group_type,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async createGroup(request) {
        const {
            group_name,
            group_type
        } = request.body;

        // ❌ ВИДАЛИТИ ЦЮ КОНВЕРТАЦІЮ:
        // const groupTypeMapping = {
        //     'young': 'молодша група',
        //     'older': 'старша група'
        // };
        // const group_type_ua = groupTypeMapping[group_type] || group_type;

        const existingGroup = await KindergartenRepository.getGroupByName(group_name);
        if (existingGroup && existingGroup.length > 0) {
            throw new Error('Група з такою назвою вже існує');
        }

        const groupData = {
            group_name,
            group_type, // ✅ Зберігаємо як є: 'young' або 'older'
            created_at: new Date()
        };

        const result = await KindergartenRepository.createGroup(groupData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення групи садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    async updateGroup(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingGroup = await KindergartenRepository.getGroupById(id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Групу не знайдено');
        }

        // ❌ ВИДАЛИТИ ЦЮ КОНВЕРТАЦІЮ:
        // if (updateData.group_type) {
        //     const groupTypeMapping = {
        //         'young': 'молодша група',
        //         'older': 'старша група'
        //     };
        //     updateData.group_type = groupTypeMapping[updateData.group_type] || updateData.group_type;
        // }

        if (updateData.group_name) {
            const duplicateGroup = await KindergartenRepository.getGroupByName(
                updateData.group_name,
                id
            );

            if (duplicateGroup && duplicateGroup.length > 0) {
                throw new Error('Група з такою назвою вже існує');
            }
        }

        const result = await KindergartenRepository.updateGroup(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення групи садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    async deleteGroup(request) {
        const { id } = request.params;

        const existingGroup = await KindergartenRepository.getGroupById(id);
        if (!existingGroup || existingGroup.length === 0) {
            throw new Error('Групу не знайдено');
        }

        const result = await KindergartenRepository.deleteGroup(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення групи садочку',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_groups',
            oid: '16505',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ДІТЕЙ САДОЧКА
    // ===============================

    async findChildrenByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'child_name', 
            sort_direction = 'asc',
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (Object.keys(whereConditions).length > 0) {
            try {
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'SEARCH',
                    client_addr: request?.ip,
                    application_name: 'Пошук дітей садочка',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'ower',
                    table_name: 'children_roster',
                    oid: '16506',
                });
            } catch (logError) {
                console.error('[findChildrenByFilter] Logging error:', logError.message);
            }
        }

        const userData = await KindergartenRepository.findChildrenByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit, userData[1]);
    }

    async getChildById(request) {
        const { id } = request.params;
        const childData = await KindergartenRepository.getChildById(id);

        if (!childData || childData.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        return childData[0];
    }

    async createChild(request) {
        const {
            child_name,
            parent_name,
            phone_number,
            
            group_id
        } = request.body;

        const existingChild = await KindergartenRepository.getChildByNameAndParent(
            child_name,
            parent_name,
            
        );

        if (existingChild && existingChild.length > 0) {
            throw new Error('Дитина з таким ПІБ та батьком вже існує в цьому садочку');
        }

        if (group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Група не знайдена');
            }
        }

        const childData = {
            child_name,
            parent_name,
            phone_number,
            
            group_id,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createChild(childData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    async updateChild(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        if (updateData.group_id) {
            const existingGroup = await KindergartenRepository.getGroupById(updateData.group_id);
            if (!existingGroup || existingGroup.length === 0) {
                throw new Error('Група не знайдена');
            }
        }

        if (updateData.child_name && updateData.parent_name) {
            const duplicateChild = await KindergartenRepository.getChildByNameAndParent(
                updateData.child_name,
                updateData.parent_name,
                
                id
            );

            if (duplicateChild && duplicateChild.length > 0) {
                throw new Error('Дитина з таким ПІБ та батьком вже існує в цьому садочку');
            }
        }

        const result = await KindergartenRepository.updateChild(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення даних дитини',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'children_roster',
            oid: '16506',
        });

        return result;
    }

    async deleteChild(request) {
        const { id } = request.params;

        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const result = await KindergartenRepository.deleteChild(id);

        try {
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'DELETE',
                client_addr: request?.ip,
                application_name: 'Видалення дитини з садочка',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'children_roster',
                oid: '16506',
            });
        } catch (logError) {
            console.error('[deleteChild] Logging error:', logError.message);
        }

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВІДВІДУВАНОСТІ
    // ===============================

    async findAttendanceByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'child_name', 
            sort_direction = 'asc',
            child_name,
            group_name,
            kindergarten_name,
            date,
            attendance_status,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        const getCurrentUkraineDate = () => {
            const now = new Date();
            const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
            return ukraineTime.toISOString().split('T')[0];
        };
        
        const filterDate = date || getCurrentUkraineDate();
        
        if (child_name || group_name || kindergarten_name || attendance_status) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }

        const userData = await KindergartenRepository.findAttendanceByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            child_name,
            group_name,
            kindergarten_name,
            date: filterDate,
            attendance_status,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getAttendanceById(request) {
        const { id } = request.params;
        
        const attendanceData = await KindergartenRepository.getAttendanceById(id);
        if (!attendanceData || attendanceData.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        return attendanceData[0];
    }

    async createAttendance(request) {
        const {
            date,
            child_id,
            attendance_status,
            notes
        } = request.body;

        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const existingAttendance = await KindergartenRepository.getAttendanceByDateAndChild(date, child_id);
        if (existingAttendance && existingAttendance.length > 0) {
            throw new Error('Запис відвідуваності для цієї дитини на цю дату вже існує');
        }

        const attendanceData = {
            date,
            child_id,
            attendance_status,
            notes: notes || null,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createAttendance(attendanceData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        // ✅ АВТОМАТИЧНО СТВОРЮЄМО PAYMENT_STATEMENT ЯКЩО ДИТИНА ПРИСУТНЯ
        if (attendance_status === 'present') {
            try {
                console.log('🎯 Дитина присутня, створюємо payment_statement');
                console.log('📅 Дата:', date);
                console.log('👶 child_id:', child_id);
                
                const existingPayment = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
                
                if (!existingPayment || existingPayment.length === 0) {
                    console.log('✅ Виписки ще немає, створюємо нову');
                    
                    const child = existingChild[0];
                    const groupId = child.group_id;
                    
                    console.log('👥 Group ID:', groupId);

                    let payment_amount = 0;
                    
                    if (groupId) {
                        const groupData = await KindergartenRepository.getGroupById(groupId);
                        
                        console.log('📊 Дані групи:', groupData);
                        
                        if (groupData && groupData.length > 0) {
                            const groupType = groupData[0].group_type;
                            const groupName = groupData[0].group_name;
                            
                            console.log('🔍 DEBUG:', {
                                groupType,
                                groupName,
                                date
                            });
                            
                            const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroupType(date, groupType);
                            
                            console.log('💰 Food cost result:', foodCostResult);
                            
                            if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
                                payment_amount = parseFloat(foodCostResult[0].cost);
                                console.log('✅ Final payment_amount:', payment_amount);
                            } else {
                                console.log('⚠️ Не знайдено вартість харчування для дати:', date);
                            }
                        }
                    } else {
                        console.log('⚠️ У дитини немає group_id');
                    }

                    const paymentData = {
                        date,
                        child_id,
                        payment_amount,
                        created_at: new Date()
                    };

                    console.log('💾 Зберігаємо payment_statement:', paymentData);

                    await KindergartenRepository.createPaymentStatement(paymentData);

                    await logRepository.createLog({
                        row_pk_id: null,
                        uid: request?.user?.id,
                        action: 'INSERT',
                        client_addr: request?.ip,
                        application_name: 'Автоматичне створення виписки по оплаті',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'payment_statements',
                        oid: '16509',
                    });
                    
                    console.log('✅ Payment statement успішно створено!');
                } else {
                    console.log('ℹ️ Виписка вже існує для цієї дати та дитини');
                }
            } catch (error) {
                console.error('❌ Помилка при створенні payment_statement:', {
                    error: error.message,
                    stack: error.stack,
                    date,
                    child_id
                });
            }
        } else {
            console.log('ℹ️ Дитина не присутня (статус:', attendance_status, '), payment_statement не створюємо');
        }

        return result;
    }

    async updateAttendance(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingAttendance = await KindergartenRepository.getAttendanceById(id);
        if (!existingAttendance || existingAttendance.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        const oldAttendance = existingAttendance[0];
        const oldStatus = oldAttendance.attendance_status;
        const newStatus = updateData.attendance_status;
        const date = oldAttendance.date;
        const child_id = oldAttendance.child_id;

        console.log('🔄 Оновлення відвідуваності:', {
            oldStatus,
            newStatus,
            date,
            child_id
        });

        // Перевірка на дублікат при зміні дати або дитини
        if (updateData.date || updateData.child_id) {
            const checkDate = updateData.date || date;
            const checkChildId = updateData.child_id || child_id;
            
            const duplicateAttendance = await KindergartenRepository.getAttendanceByDateAndChild(
                checkDate,
                checkChildId,
                id
            );

            if (duplicateAttendance && duplicateAttendance.length > 0) {
                throw new Error('Запис відвідуваності для цієї дитини на цю дату вже існує');
            }
        }

        const result = await KindergartenRepository.updateAttendance(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        // ✅ ЛОГІКА РОБОТИ З PAYMENT_STATEMENTS
        try {
            const existingPayment = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);

            // Якщо статус змінився з "present" на щось інше - ВИДАЛЯЄМО payment_statement
            if (oldStatus === 'present' && newStatus !== 'present') {
                console.log('🗑️ Дитина більше не присутня, видаляємо payment_statement');
                
                if (existingPayment && existingPayment.length > 0) {
                    const paymentId = existingPayment[0].id;
                    await KindergartenRepository.deletePaymentStatement(paymentId);
                    
                    await logRepository.createLog({
                        row_pk_id: paymentId,
                        uid: request?.user?.id,
                        action: 'DELETE',
                        client_addr: request?.ip,
                        application_name: 'Автоматичне видалення виписки по оплаті',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'payment_statements',
                        oid: '16509',
                    });
                    
                    console.log('✅ Payment statement видалено');
                }
            }
            
            // Якщо статус змінився на "present" - СТВОРЮЄМО payment_statement
            else if (oldStatus !== 'present' && newStatus === 'present') {
                console.log('✅ Дитина тепер присутня, створюємо payment_statement');
                
                if (!existingPayment || existingPayment.length === 0) {
                    const child = await KindergartenRepository.getChildById(child_id);
                    
                    if (child && child.length > 0) {
                        const groupId = child[0].group_id;
                        let payment_amount = 0;
                        
                        if (groupId) {
                            const groupData = await KindergartenRepository.getGroupById(groupId);
                            
                            if (groupData && groupData.length > 0) {
                                const groupType = groupData[0].group_type;
                                const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroupType(date, groupType);
                                
                                if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
                                    payment_amount = parseFloat(foodCostResult[0].cost);
                                }
                            }
                        }

                        const paymentData = {
                            date,
                            child_id,
                            payment_amount,
                            created_at: new Date()
                        };

                        await KindergartenRepository.createPaymentStatement(paymentData);

                        await logRepository.createLog({
                            row_pk_id: null,
                            uid: request?.user?.id,
                            action: 'INSERT',
                            client_addr: request?.ip,
                            application_name: 'Автоматичне створення виписки по оплаті',
                            action_stamp_tx: new Date(),
                            action_stamp_stm: new Date(),
                            action_stamp_clk: new Date(),
                            schema_name: 'ower',
                            table_name: 'payment_statements',
                            oid: '16509',
                        });
                        
                        console.log('✅ Payment statement створено');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Помилка при роботі з payment_statement:', {
                error: error.message,
                date,
                child_id
            });
        }

        return result;
    }

    async deleteAttendance(request) {
        const { id } = request.params;

        const existingRecord = await KindergartenRepository.getAttendanceById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис відвідуваності не знайдено');
        }

        const result = await KindergartenRepository.deleteAttendance(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення запису відвідуваності',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'attendance',
            oid: '16507',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВАРТОСТІ ХАРЧУВАННЯ
    // ===============================

    async findDailyFoodCostByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'date', 
            sort_direction = 'desc',
            date_from,
            date_to,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (date_from || date_to) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук вартості харчування',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'daily_food_cost',
                oid: '16508',
            });
        }

        const userData = await KindergartenRepository.findDailyFoodCostByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            date_from,
            date_to,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async createDailyFoodCost(request) {
        const {
            date,
            young_group_cost,
            older_group_cost
        } = request.body;

        const existingRecord = await KindergartenRepository.getDailyFoodCostByDateAndExcludeId(date);

        if (existingRecord && existingRecord.length > 0) {
            throw new Error('Вартість харчування на цю дату вже існує');
        }

        const recordData = {
            date,
            young_group_cost,
            older_group_cost,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createDailyFoodCost(recordData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        return result;
    }

    async updateDailyFoodCost(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingRecord = await KindergartenRepository.getDailyFoodCostById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис не знайдено');
        }

        if (updateData.date) {
            const duplicateRecord = await KindergartenRepository.getDailyFoodCostByDateAndExcludeId(
                updateData.date, 
                id
            );

            if (duplicateRecord && duplicateRecord.length > 0) {
                throw new Error('Вартість харчування на цю дату вже існує');
            }
        }

        const result = await KindergartenRepository.updateDailyFoodCost(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        return result;
    }

    async deleteDailyFoodCost(request) {
        const { id } = request.params;

        const existingRecord = await KindergartenRepository.getDailyFoodCostById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис не знайдено');
        }

        const result = await KindergartenRepository.deleteDailyFoodCost(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення вартості харчування',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'daily_food_cost',
            oid: '16508',
        });

        return result;
    }

    // ===============================
    // МЕТОДИ ДЛЯ БАТЬКІВСЬКОЇ ПЛАТИ
    // ===============================

    async findBillingByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'payment_month', 
            sort_direction = 'desc',
            payment_month_from,
            payment_month_to,
            parent_name,
            balance_min,
            balance_max,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (payment_month_from || payment_month_to || parent_name || balance_min || balance_max) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук батьківської плати',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_billing',
                oid: '16509',
            });
        }

        const userData = await KindergartenRepository.findBillingByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            payment_month_from,
            payment_month_to,
            parent_name,
            balance_min,
            balance_max,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getBillingById(request) {
        const { id } = request.params;
        
        const result = await KindergartenRepository.getBillingById(id);
        if (!result || result.length === 0) {
            throw new Error('Запис батьківської плати не знайдено');
        }

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'SEARCH',
            client_addr: request?.ip,
            application_name: 'Перегляд батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_billing',
            oid: '16509',
        });

        return result[0];
    }

    async createBilling(request) {
        const {
            parent_name,
            payment_month,
            current_debt,
            current_accrual,
            current_payment,
            notes
        } = request.body;

        // Конвертуємо "2025-06" в "2025-06-01"
        let formattedMonth = payment_month;
        if (payment_month && !payment_month.match(/^\d{4}-\d{2}-\d{2}$/)) {
            formattedMonth = `${payment_month}-01`;
        }

        // Перевірка на дублікат
        const existingBilling = await KindergartenRepository.getBillingByParentAndMonth(
            parent_name,
            formattedMonth
        );
        
        if (existingBilling && existingBilling.length > 0) {
            const existing = existingBilling[0]; // ✅ Важливо брати перший елемент
            
            console.log('🔍 Found existing billing:', existing); // DEBUG
            
            // Створюємо помилку з даними
            const error = new Error('DUPLICATE_BILLING');
            error.statusCode = 409;
            error.existingData = {
                id: existing.id,
                parent_name: existing.parent_name,
                payment_month: existing.payment_month,
                current_debt: parseFloat(existing.current_debt) || 0,
                current_accrual: parseFloat(existing.current_accrual) || 0,
                current_payment: parseFloat(existing.current_payment) || 0,
                balance: parseFloat(existing.balance) || 0,
                notes: existing.notes || ''
            };
            
            console.log('📤 Sending existingData:', error.existingData); // DEBUG
            throw error;
        }

        const billingData = {
            parent_name,
            payment_month: formattedMonth,
            current_debt: parseFloat(current_debt) || 0,
            current_accrual: parseFloat(current_accrual) || 0,
            current_payment: parseFloat(current_payment) || 0,
            notes: notes || null,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createBilling(billingData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення запису батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'billing',
            oid: '16508',
        });

        return result;
    }

    async updateBilling(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingBilling = await KindergartenRepository.getBillingById(id);
        if (!existingBilling || existingBilling.length === 0) {
            throw new Error('Запис батьківської плати не знайдено');
        }

        // ✅ Конвертуємо "2025-06" в "2025-06-01" для PostgreSQL DATE
        if (updateData.payment_month && !updateData.payment_month.match(/^\d{4}-\d{2}-\d{2}$/)) {
            updateData.payment_month = `${updateData.payment_month}-01`;
        }

        // Перевірка на дублікат при зміні ПІБ або місяця
        if (updateData.parent_name || updateData.payment_month) {
            const checkName = updateData.parent_name || existingBilling[0].parent_name;
            const checkMonth = updateData.payment_month || existingBilling[0].payment_month;
            
            const duplicateBilling = await KindergartenRepository.getBillingByParentAndMonth(
                checkName,
                checkMonth,
                id
            );

            if (duplicateBilling && duplicateBilling.length > 0) {
                throw new Error('Запис для цього батька та місяця вже існує');
            }
        }

        // Конвертуємо числові значення
        if (updateData.current_debt !== undefined) {
            updateData.current_debt = parseFloat(updateData.current_debt) || 0;
        }
        if (updateData.current_accrual !== undefined) {
            updateData.current_accrual = parseFloat(updateData.current_accrual) || 0;
        }
        if (updateData.current_payment !== undefined) {
            updateData.current_payment = parseFloat(updateData.current_payment) || 0;
        }

        const result = await KindergartenRepository.updateBilling(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення запису батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'billing',
            oid: '16508',
        });

        return result;
    }

    async deleteBilling(request) {
        const { id } = request.params;

        const existingRecord = await KindergartenRepository.getBillingById(id);
        if (!existingRecord || existingRecord.length === 0) {
            throw new Error('Запис батьківської плати не знайдено');
        }

        const result = await KindergartenRepository.deleteBilling(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення батьківської плати',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_billing',
            oid: '16509',
        });

        return result;
    }

    // ===============================
    // ✅ API ДЛЯ МОБІЛЬНОГО ДОДАТКУ (ВИПРАВЛЕНО - TOGGLE ЛОГІКА)
    // ===============================

    async getMobileAttendance(timestamp, request) {
        // Конвертуємо timestamp в дату
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];
        
        // Отримуємо всі групи з дітьми та їх відвідуваністю на цю дату
        const groups = await KindergartenRepository.getMobileAttendanceByDate(date);
        
        // Логування
        if (request?.user?.id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request.user.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Мобільний додаток - перегляд відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }
        
        // Формуємо відповідь у форматі для мобільного додатку
        const response = {
            date: timestamp,
            groups: groups.map(group => ({
                id: group.group_id,
                name: group.group_name,
                group: group.children.map(child => ({
                    id: child.child_id,
                    name: child.child_name,
                    selected: child.attendance_status === 'present'
                }))
            }))
        };
        
        return response;
    }
    
    // ✅ ВИПРАВЛЕНИЙ МЕТОД З TOGGLE ЛОГІКОЮ
    async saveMobileAttendance(request) {
        const { date, groups } = request.body;
        
        if (!date || !groups || !Array.isArray(groups)) {
            throw new Error("Невірний формат даних");
        }
        
        // Конвертуємо timestamp в дату
        const dateString = new Date(date * 1000).toISOString().split('T')[0];
        
        const results = [];
        const errors = [];
        
        // Обробляємо кожну групу
        for (const group of groups) {
            const groupName = group.name;
            
            // ✅ ПІДТРИМКА ОБОХ ФОРМАТІВ
            const childrenArray = group.children || group.group;
            
            if (!groupName || !childrenArray || !Array.isArray(childrenArray)) {
                errors.push({
                    group: groupName,
                    error: 'Невірний формат групи'
                });
                continue;
            }
            
            // Обробляємо кожну дитину в групі
            for (const child of childrenArray) {
                const childName = child.name;
                
                // ✅ ВИЗНАЧАЄМО ФОРМАТ: новий (status) чи старий (selected)
                let targetStatus;
                if (child.status) {
                    // Новий формат: status = "present" | "absent"
                    targetStatus = child.status;
                } else if (child.selected !== undefined) {
                    // Старий формат: selected = true | false
                    targetStatus = child.selected ? 'present' : 'absent';
                } else {
                    errors.push({
                        child: childName,
                        group: groupName,
                        error: 'Відсутній статус (status або selected)'
                    });
                    continue;
                }
                
                if (!childName) {
                    errors.push({
                        group: groupName,
                        error: 'Відсутнє ПІБ дитини'
                    });
                    continue;
                }
                
                try {
                    // ✅ ШУКАЄМО ДИТИНУ ПО ПІБ + ГРУПІ
                    const existingChild = await KindergartenRepository.getChildByNameAndGroup(
                        childName,
                        groupName
                    );
                    
                    if (!existingChild) {
                        errors.push({
                            child: childName,
                            group: groupName,
                            error: `Дитину не знайдено в групі`
                        });
                        continue;
                    }
                    
                    const childId = existingChild.id;
                    
                    // Перевіряємо чи існує запис відвідуваності
                    const existingAttendance = await KindergartenRepository.getAttendanceByDateAndChild(
                        dateString,
                        childId
                    );
                    
                    if (existingAttendance && existingAttendance.length > 0) {
                        // Є запис - оновлюємо статус
                        const currentStatus = existingAttendance[0].attendance_status;
                        
                        if (currentStatus !== targetStatus) {
                            await KindergartenRepository.updateAttendance(
                                existingAttendance[0].id,
                                { attendance_status: targetStatus }
                            );
                            
                            results.push({
                                child: childName,
                                group: groupName,
                                action: 'updated',
                                old_status: currentStatus,
                                new_status: targetStatus
                            });
                        } else {
                            results.push({
                                child: childName,
                                group: groupName,
                                action: 'unchanged',
                                status: targetStatus
                            });
                        }
                    } else {
                        // Немає запису - створюємо
                        await KindergartenRepository.createAttendance({
                            date: dateString,
                            child_id: childId,
                            attendance_status: targetStatus,
                            notes: null,
                            created_at: new Date()
                        });
                        
                        results.push({
                            child: childName,
                            group: groupName,
                            action: 'created',
                            new_status: targetStatus
                        });
                    }
                } catch (error) {
                    errors.push({
                        child: childName,
                        group: groupName,
                        error: error.message
                    });
                }
            }
        }
        
        // Логування
        if (request?.user?.id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request.user.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Мобільний додаток - збереження відвідуваності',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'attendance',
                oid: '16507',
            });
        }
        
        return {
            success: results.length > 0,
            message: `Оброблено ${results.length} записів`,
            updated_count: results.length,
            error_count: errors.length,
            details: {
                results,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    }

    // ===============================
    // МЕТОДИ ДЛЯ АДМІНІСТРАТОРІВ САДОЧКА
    // ===============================

    async findAdminsByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'id', 
            sort_direction = 'desc',
            phone_number,
            full_name,
            kindergarten_name,
            role,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (phone_number || full_name || kindergarten_name || role) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук адміністраторів садочка',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'kindergarten_admins',
                oid: '16510',
            });
        }

        const userData = await KindergartenRepository.findAdminsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            phone_number,
            full_name,
            kindergarten_name,
            role,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getAdminById(request) {
        const { id } = request.params;
        
        const adminData = await KindergartenRepository.getAdminById(id);
        if (!adminData || adminData.length === 0) {
            throw new Error('Адміністратора не знайдено');
        }

        return adminData[0];
    }

    async createAdmin(request) {
        const {
            phone_number,
            full_name,
            kindergarten_name,
            role = 'educator'
        } = request.body;

        const existingAdmin = await KindergartenRepository.getAdminByPhone(phone_number);

        if (existingAdmin && existingAdmin.length > 0) {
            throw new Error('Адміністратор з таким номером телефону вже існує');
        }

        const adminData = {
            phone_number,
            full_name,
            kindergarten_name,
            role,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createAdmin(adminData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення адміністратора садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_admins',
            oid: '16510',
        });

        return result;
    }

    async updateAdmin(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingAdmin = await KindergartenRepository.getAdminById(id);
        if (!existingAdmin || existingAdmin.length === 0) {
            throw new Error('Адміністратора не знайдено');
        }

        if (updateData.phone_number) {
            const duplicateAdmin = await KindergartenRepository.getAdminByPhone(
                updateData.phone_number,
                id
            );

            if (duplicateAdmin && duplicateAdmin.length > 0) {
                throw new Error('Адміністратор з таким номером телефону вже існує');
            }
        }

        const result = await KindergartenRepository.updateAdmin(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення адміністратора садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_admins',
            oid: '16510',
        });

        return result;
    }

    async deleteAdmin(request) {
        const { id } = request.params;

        const existingAdmin = await KindergartenRepository.getAdminById(id);
        if (!existingAdmin || existingAdmin.length === 0) {
            throw new Error('Адміністратора не знайдено');
        }

        const result = await KindergartenRepository.deleteAdmin(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення адміністратора садочка',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'kindergarten_admins',
            oid: '16510',
        });

        return result;
    }

    // ===============================
    // ПЕРЕВІРКА ЧИ Є ВИХОВАТЕЛЕМ
    // ===============================

    async verifyEducator(request) {
        try {
            let { phone_number } = request.body;

            if (!phone_number) {
                throw new Error('Номер телефону обов\'язковий');
            }

            console.log('[verifyEducator] Original phone:', phone_number);

            // Нормалізація номера
            phone_number = phone_number.replace(/[\s\-\(\)]/g, '');
            
            if (phone_number.startsWith('0')) {
                phone_number = '+38' + phone_number;
            }
            
            if (!phone_number.startsWith('+')) {
                phone_number = '+' + phone_number;
            }

            console.log('[verifyEducator] Normalized phone:', phone_number);

            let educator;
            try {
                educator = await KindergartenRepository.verifyEducator(phone_number);
                console.log('[verifyEducator] Database result:', educator);
            } catch (dbError) {
                console.error('[verifyEducator] Database error:', dbError);
                throw new Error(`Помилка запиту до бази даних: ${dbError.message}`);
            }

            // Логування
            if (request?.user?.id) {
                try {
                    await logRepository.createLog({
                        row_pk_id: educator && educator.length > 0 ? educator[0].id : null,
                        uid: request.user.id,
                        action: 'SEARCH',
                        client_addr: request?.ip,
                        application_name: 'Перевірка вихователя (мобільний додаток)',
                        action_stamp_tx: new Date(),
                        action_stamp_stm: new Date(),
                        action_stamp_clk: new Date(),
                        schema_name: 'ower',
                        table_name: 'kindergarten_admins',
                        oid: '16510',
                    });
                } catch (logError) {
                    console.error('[verifyEducator] Logging error (non-critical):', logError.message);
                }
            } else {
                console.warn('[verifyEducator] request.user.id not found - logging skipped');
            }

            const result = {
                isEducator: educator && educator.length > 0,
                educatorInfo: educator && educator.length > 0 ? {
                    id: educator[0].id,
                    phone_number: educator[0].phone_number,
                    full_name: educator[0].full_name,
                    kindergarten_name: educator[0].kindergarten_name
                } : null
            };

            console.log('[verifyEducator] Final result:', result);
            
            return result;

        } catch (error) {
            console.error('[verifyEducator] Fatal error:', error);
            throw error;
        }
    }

    // ===============================
    // МЕТОДИ ДЛЯ ВИПИСКИ ПО ОПЛАТІ
    // ===============================

    async findPaymentStatementsByFilter(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'date', 
            sort_direction = 'desc',
            date_from,
            date_to,
            child_name,
            group_id,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        if (date_from || date_to || child_name || group_id) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук виписки по оплаті',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'payment_statements',
                oid: '16509',
            });
        }

        const userData = await KindergartenRepository.findPaymentStatementsByFilter({
            limit,
            offset,
            sort_by,
            sort_direction,
            date_from,
            date_to,
            child_name,
            group_id,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    async getPaymentStatementById(request) {
        const { id } = request.params;

        const paymentStatement = await KindergartenRepository.getPaymentStatementById(id);
        
        if (!paymentStatement || paymentStatement.length === 0) {
            throw new Error('Запис не знайдено');
        }

        return paymentStatement[0];
    }

    async createPaymentStatement(request) {
        const {
            date,
            child_id,
            payment_amount
        } = request.body;

        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const existingStatement = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
        if (existingStatement && existingStatement.length > 0) {
            throw new Error('Виписка для цієї дитини на цю дату вже існує');
        }

        const statementData = {
            date,
            child_id,
            payment_amount,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createPaymentStatement(statementData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async createPaymentStatementAuto(request) {
        const {
            date,
            child_id
        } = request.body;

        const existingChild = await KindergartenRepository.getChildById(child_id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        const child = existingChild[0];
        const groupName = child.group_name;

        const existingStatement = await KindergartenRepository.getPaymentStatementByDateAndChild(date, child_id);
        if (existingStatement && existingStatement.length > 0) {
            throw new Error('Виписка для цієї дитини на цю дату вже існує');
        }

        const foodCostResult = await KindergartenRepository.getDailyFoodCostByDateAndGroup(date, groupName);
        
        let payment_amount = 0;
        if (foodCostResult && foodCostResult.length > 0 && foodCostResult[0].cost) {
            payment_amount = parseFloat(foodCostResult[0].cost);
        }

        if (payment_amount === 0) {
            throw new Error(`Вартість харчування для групи "${groupName}" на дату ${date} не знайдена`);
        }

        const statementData = {
            date,
            child_id,
            payment_amount,
            created_at: new Date()
        };

        const result = await KindergartenRepository.createPaymentStatement(statementData);

        await logRepository.createLog({
            row_pk_id: result.insertId || result.id || result[0]?.id,
            uid: request?.user?.id,
            action: 'INSERT',
            client_addr: request?.ip,
            application_name: 'Створення виписки по оплаті (автозаповнення)',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async updatePaymentStatement(request) {
        const { id } = request.params;
        const updateData = request.body;

        const existingStatement = await KindergartenRepository.getPaymentStatementById(id);
        if (!existingStatement || existingStatement.length === 0) {
            throw new Error('Запис не знайдено');
        }

        if (updateData.child_id) {
            const existingChild = await KindergartenRepository.getChildById(updateData.child_id);
            if (!existingChild || existingChild.length === 0) {
                throw new Error('Дитину не знайдено');
            }
        }

        if (updateData.date || updateData.child_id) {
            const checkDate = updateData.date || existingStatement[0].date;
            const checkChildId = updateData.child_id || existingStatement[0].child_id;
            
            const duplicateStatement = await KindergartenRepository.getPaymentStatementByDateAndChild(
                checkDate,
                checkChildId,
                id
            );

            if (duplicateStatement && duplicateStatement.length > 0) {
                throw new Error('Виписка для цієї дитини на цю дату вже існує');
            }
        }

        const result = await KindergartenRepository.updatePaymentStatement(id, updateData);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async deletePaymentStatement(request) {
        const { id } = request.params;

        const existingStatement = await KindergartenRepository.getPaymentStatementById(id);
        if (!existingStatement || existingStatement.length === 0) {
            throw new Error('Запис не знайдено');
        }

        const result = await KindergartenRepository.deletePaymentStatement(id);

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'DELETE',
            client_addr: request?.ip,
            application_name: 'Видалення виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return result;
    }

    async findMonthlyPaymentStatements(request) {
        const { 
            page = 1, 
            limit = 16, 
            sort_by = 'child_name', 
            sort_direction = 'asc',
            month, // "2025-11"
            group_type, // 'young', 'older', або undefined
            child_name,
            ...whereConditions 
        } = request.body;

        const { offset } = paginate(page, limit);
        
        // Якщо місяць не вказано, використовуємо поточний
        const currentMonth = month || new Date().toISOString().slice(0, 7);
        
        if (child_name || group_type) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук місячної виписки по оплаті',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'ower',
                table_name: 'payment_statements',
                oid: '16509',
            });
        }

        const userData = await KindergartenRepository.findMonthlyPaymentStatements({
            limit,
            offset,
            sort_by,
            sort_direction,
            month: currentMonth,
            group_type,
            child_name,
            ...whereConditions
        });

        return paginationData(userData[0], page, limit);
    }

    // Оновити метод updatePaymentStatement для підтримки місячного оновлення
    async updateMonthlyPaymentStatement(request) {
        const { id } = request.params; // це буде child_id
        const { total_amount, month } = request.body;

        const existingChild = await KindergartenRepository.getChildById(id);
        if (!existingChild || existingChild.length === 0) {
            throw new Error('Дитину не знайдено');
        }

        // Отримуємо всі payment_statements для цієї дитини за місяць
        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        const existingStatements = await KindergartenRepository.getMonthlyPaymentStatement(
            month,
            id
        );

        if (!existingStatements || existingStatements.length === 0) {
            throw new Error('Записи за цей місяць не знайдено');
        }

        // Тут можна реалізувати логіку оновлення всіх записів за місяць
        // або створити новий підхід до зберігання місячних сум

        await logRepository.createLog({
            row_pk_id: id,
            uid: request?.user?.id,
            action: 'UPDATE',
            client_addr: request?.ip,
            application_name: 'Оновлення місячної виписки по оплаті',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'payment_statements',
            oid: '16509',
        });

        return { success: true, total_amount };
    }
}

module.exports = new KindergartenService();