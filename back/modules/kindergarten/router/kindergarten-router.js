const { RouterGuard } = require('../../../helpers/Guard');
const { accessLevel } = require('../../../utils/constants');
const { viewLimit } = require('../../../utils/ratelimit');
const kindergartenController = require('../controller/kindergarten-controller');
const { 
    kindergartenFilterSchema, 
    kindergartenInfoSchema, 
    kindergartenGroupFilterSchema, 
    kindergartenGroupCreateSchema,
    kindergartenGroupUpdateSchema,
    kindergartenGroupDeleteSchema,
    childrenFilterSchema,
    childrenCreateSchema,
    childrenUpdateSchema,
    childrenDeleteSchema,
    childrenInfoSchema,
    attendanceFilterSchema,
    attendanceCreateSchema,
    attendanceUpdateSchema,
    attendanceDeleteSchema,
    attendanceInfoSchema,
    dailyFoodCostFilterSchema,
    dailyFoodCostCreateSchema,
    dailyFoodCostUpdateSchema,
    dailyFoodCostDeleteSchema,
    billingFilterSchema,
    billingInfoSchema,
    billingCreateSchema,
    billingUpdateSchema,
    billingDeleteSchema,
    mobileAttendanceGetSchema,
    mobileAttendanceSaveSchema,
    adminsInfoSchema,
    adminsFilterSchema,
    adminsCreateSchema,
    adminsUpdateSchema,
    adminsDeleteSchema,
    verifyEducatorSchema,
    validateMobileAttendanceFormat,
    paymentStatementFilterSchema,
    paymentStatementCreateSchema,
    paymentStatementCreateAutoSchema,
    paymentStatementUpdateSchema,
    paymentStatementDeleteSchema,
    paymentStatementInfoSchema,
    paymentStatementMonthlyFilterSchema,
    
} = require('../schema/kindergarten-schema');

const routes = async (fastify) => {
    // Роути для основної функціональності садочків
    fastify.post("/filter", { 
        schema: kindergartenFilterSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, kindergartenController.findDebtByFilter);
    
    fastify.get("/info/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }), 
        config: viewLimit 
    }, kindergartenController.getDebtByDebtorId);
    
    fastify.get("/generate/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, kindergartenController.generateWordByDebtId);
    
    fastify.get("/print/:id", { 
        schema: kindergartenInfoSchema, 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }) 
    }, kindergartenController.printDebtId);

    // Роути для груп садочків
    fastify.post("/groups/filter", { 
        schema: kindergartenGroupFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findGroupsByFilter);

    fastify.post("/groups", { 
        schema: kindergartenGroupCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createGroup);

    fastify.put("/groups/:id", { 
        schema: kindergartenGroupUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updateGroup);

    fastify.delete("/groups/:id", { 
        schema: kindergartenGroupDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deleteGroup);

    // Роути для дітей садочку
    fastify.post("/childrenRoster/filter", { 
        schema: childrenFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findChildrenByFilter);

    fastify.get("/childrenRoster/:id", { 
        schema: childrenInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getChildById);

    fastify.post("/childrenRoster", { 
        schema: childrenCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createChild);

    fastify.put("/childrenRoster/:id", { 
        schema: childrenUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updateChild);

    fastify.delete("/childrenRoster/:id", { 
        schema: childrenDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deleteChild);

    // ===============================
    // РОУТИ ДЛЯ ВІДВІДУВАНОСТІ САДОЧКУ
    // ===============================
    
    fastify.post("/attendance/filter", { 
        schema: attendanceFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findAttendanceByFilter);

    fastify.get("/attendance/:id", { 
        schema: attendanceInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getAttendanceById);

    fastify.post("/attendance", { 
        schema: attendanceCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createAttendance);

    fastify.put("/attendance/:id", { 
        schema: attendanceUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updateAttendance);

    fastify.delete("/attendance/:id", { 
        schema: attendanceDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deleteAttendance);

    // Роути для вартості харчування садочку
    fastify.post("/daily_food_cost/filter", { 
        schema: dailyFoodCostFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findDailyFoodCostByFilter);

    fastify.post("/daily_food_cost", { 
        schema: dailyFoodCostCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createDailyFoodCost);

    fastify.put("/daily_food_cost/:id", { 
        schema: dailyFoodCostUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updateDailyFoodCost);

    fastify.delete("/daily_food_cost/:id", { 
        schema: dailyFoodCostDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deleteDailyFoodCost);

    // Роути для батьківської плати садочку
    fastify.post("/billing/filter", { 
        schema: billingFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findBillingByFilter);

    fastify.get("/billing/:id", { 
        schema: billingInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getBillingById);

    fastify.post("/billing", { 
        schema: billingCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createBilling);

    fastify.put("/billing/:id", { 
        schema: billingUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updateBilling);

    fastify.delete("/billing/:id", { 
        schema: billingDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deleteBilling);

    // ===============================
    // РОУТИ ДЛЯ МОБІЛЬНОГО ДОДАТКУ
    // ===============================
    
    fastify.get("/attendance/mobile/:date", { 
        schema: mobileAttendanceGetSchema,
        preParsing: RouterGuard()  // Мінімальна авторизація без перевірки прав
    }, kindergartenController.getMobileAttendance);

    fastify.post("/attendance/mobile", { 
        schema: mobileAttendanceSaveSchema,
        preHandler: [
            RouterGuard(),
            validateMobileAttendanceFormat
        ]
    }, kindergartenController.saveMobileAttendance);

    //PUT метод для мобільного додатку
    fastify.put("/attendance/mobile", { 
        schema: mobileAttendanceSaveSchema,
        preHandler: [
            RouterGuard(),
            validateMobileAttendanceFormat
        ]
    }, kindergartenController.saveMobileAttendance);

    // ===============================
    // РОУТИ ДЛЯ АДМІНІСТРАТОРІВ САДОЧКУ
    // ===============================
    
    fastify.post("/admins/filter", { 
        schema: adminsFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findAdminsByFilter);

    fastify.get("/admins/:id", { 
        schema: adminsInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getAdminById);

    fastify.post("/admins", { 
        schema: adminsCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createAdmin);

    fastify.put("/admins/:id", { 
        schema: adminsUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updateAdmin);

    fastify.delete("/admins/:id", { 
        schema: adminsDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deleteAdmin);

    // ===============================
    // РОУТ ДЛЯ ПЕРЕВІРКИ ВИХОВАТЕЛЯ
    // ===============================

    fastify.post("/admins/verify", { 
        schema: verifyEducatorSchema,
        preParsing: RouterGuard()  // Мінімальна авторизація без перевірки прав
    }, kindergartenController.verifyEducator);

    // ===============================
    // РОУТИ ДЛЯ ВИПИСКИ ПО ОПЛАТІ
    // ===============================

    fastify.post("/payment_statements/filter", { 
        schema: paymentStatementFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findPaymentStatementsByFilter);

    fastify.get("/payment_statements/:id", { 
        schema: paymentStatementInfoSchema,  
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW }),
        config: viewLimit 
    }, kindergartenController.getPaymentStatementById);

    fastify.post("/payment_statements", { 
        schema: paymentStatementCreateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createPaymentStatement);

    fastify.post("/payment_statements/auto", { 
        schema: paymentStatementCreateAutoSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.createPaymentStatementAuto);

    fastify.put("/payment_statements/:id", { 
        schema: paymentStatementUpdateSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.EDIT })
    }, kindergartenController.updatePaymentStatement);

    fastify.delete("/payment_statements/:id", { 
        schema: paymentStatementDeleteSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.DELETE })
    }, kindergartenController.deletePaymentStatement);

    // POST метод для парсингу PDF квитанції
    fastify.post("/billing/parse-pdf", { 
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.INSERT })
    }, kindergartenController.parseBillingPDF);

    fastify.post("/payment_statements/monthly", { 
        schema: paymentStatementMonthlyFilterSchema,
        preParsing: RouterGuard({ permissionLevel: "debtor", permissions: accessLevel.VIEW })
    }, kindergartenController.findMonthlyPaymentStatements);

}

module.exports = routes;