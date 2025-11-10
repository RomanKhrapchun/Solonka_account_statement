import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import Input from "../../components/common/Input/Input";
import './KindergartenBilling.css';

// Іконки
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}
const childDropDownStyle = {justifyContent: 'center'}

// Константи для збереження стану
const KINDERGARTEN_BILLING_STATE_KEY = 'kindergartenBillingState';

const saveKindergartenBillingState = (state) => {
    try {
        sessionStorage.setItem(KINDERGARTEN_BILLING_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save kindergarten billing state:', error);
    }
};

const loadKindergartenBillingState = () => {
    try {
        const saved = sessionStorage.getItem(KINDERGARTEN_BILLING_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load kindergarten billing state:', error);
    }
    return null;
};

const clearKindergartenBillingState = () => {
    try {
        sessionStorage.removeItem(KINDERGARTEN_BILLING_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear kindergarten billing state:', error);
    }
};

const KindergartenBilling = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    const editModalNodeRef = useRef(null)
    const deleteModalNodeRef = useRef(null)
    const filterDropdownRef = useRef(null)

    // стан для списку батьківської плати
    const [stateBilling, setStateBilling] = useState(() => {
        const savedState = loadKindergartenBillingState();
        
        return savedState || {
            sendData: {
                page: 1,
                limit: 16,
                sort_by: 'payment_month',
                sort_direction: 'desc'
            },
            selectData: {
                parent_name: '',
                payment_month_from: '',
                payment_month_to: '',
                balance_min: '',
                balance_max: ''
            },
            isFilterOpen: false
        };
    });

    // Стан для модального вікна додавання
    const [modalState, setModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            parent_name: '',
            payment_month: '',
            current_debt: '',
            current_accrual: '',
            current_payment: '',
            notes: ''
        }
    });

    // Стан для модального вікна редагування
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        itemId: null,
        formData: {
            parent_name: '',
            payment_month: '',
            current_debt: '',
            current_accrual: '',
            current_payment: '',
            notes: ''
        }
    });

    // Стан для модального вікна видалення
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        itemId: null,
        parentName: ''
    });

    const isFirstAPI = useRef(true);

    const {error, status, data, retryFetch} = useFetch('api/kindergarten/billing/filter', {
        method: 'post',
        data: stateBilling.sendData
    })
    
    const startRecord = ((stateBilling.sendData.page || 1) - 1) * stateBilling.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateBilling.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/billing/filter', {
            method: 'post',
            data: stateBilling.sendData
        });
    }, [stateBilling.sendData, retryFetch]);

    // Ефект для закриття фільтра при кліку поза ним
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setStateBilling(prev => ({ ...prev, isFilterOpen: false }));
            }
        };

        if (stateBilling.isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [stateBilling.isFilterOpen]);

    // Зберігання стану
    useEffect(() => {
        saveKindergartenBillingState(stateBilling);
    }, [stateBilling]);

    // Очищення стану при розмонтуванні
    useEffect(() => {
        return () => {
            clearKindergartenBillingState();
        };
    }, []);

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateBilling.selectData).some(value => 
            value !== null && 
            value !== undefined && 
            value !== '' && 
            (!Array.isArray(value) || value.length > 0)
        );
    }, [stateBilling.selectData]);

    const createSortableColumn = (title, dataIndex, render = null, width = null) => {
        const isActive = stateBilling.sendData.sort_by === dataIndex;
        const direction = stateBilling.sendData.sort_direction;
        
        return {
            title: (
                <span 
                    onClick={() => handleSort(dataIndex)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    className={`sortable-header ${isActive ? 'active' : ''}`}
                >
                    {title} {isActive && (direction === 'asc' ? sortUpIcon : sortDownIcon)}
                </span>
            ),
            dataIndex,
            headerClassName: isActive ? 'sorted-column' : '',
            render: render,
            width: width
        };
    };

    const handleSort = useCallback((columnName) => {
        const currentSort = stateBilling.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateBilling(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, []);

    const columns = useMemo(() => {
        return [
            createSortableColumn('ПІБ батьків', 'parent_name', null, 200),
            createSortableColumn('Місяць оплати', 'payment_month', (value) => {
                return new Date(value).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' });
            }, 130),
            createSortableColumn('Борг', 'current_debt', (value) => {
                return `${parseFloat(value || 0).toFixed(2)} грн`;
            }, 100),
            createSortableColumn('Нарахування', 'current_accrual', (value) => {
                return `${parseFloat(value || 0).toFixed(2)} грн`;
            }, 120),
            createSortableColumn('Оплачено', 'current_payment', (value) => {
                return `${parseFloat(value || 0).toFixed(2)} грн`;
            }, 110),
            createSortableColumn('Сальдо', 'balance', (value) => {
                const balance = parseFloat(value || 0);
                const balanceClass = balance > 0 ? 'balance-negative' : balance < 0 ? 'balance-positive' : 'balance-zero';
                
                // Логіка для правильного відображення сальдо:
                // balance > 0 означає борг (недоплата) - показуємо з мінусом
                // balance < 0 означає переплата - показуємо з плюсом  
                // balance = 0 - нуль
                let displayText;
                if (balance > 0) {
                    displayText = `-${balance.toFixed(2)} грн`;
                } else if (balance < 0) {
                    displayText = `+${Math.abs(balance).toFixed(2)} грн`;
                } else {
                    displayText = `${balance.toFixed(2)} грн`;
                }
                
                return (
                    <span className={`balance-column ${balanceClass}`}>
                        {displayText}
                    </span>
                );
            }, 120),
            {
                title: 'Дії',
                key: 'actions',
                width: 120,
                render: (_, record) => (
                    <div className="actions-group">
                        <Button
                            className="small"
                            icon={editIcon}
                            onClick={() => handleEdit(record)}
                            title="Редагувати"
                        />
                        <Button
                            className="small danger"
                            icon={deleteIcon}
                            onClick={() => handleDelete(record)}
                            title="Видалити"
                        />
                    </div>
                )
            }
        ];
    }, [stateBilling.sendData]);

    // Меню для dropdown кількості записів
    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateBilling.sendData.limit !== 16) {
                    setStateBilling(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 16,
                            page: 1,
                        }
                    }))
                }
            },
        },
        {
            label: '32',
            key: '32',
            onClick: () => {
                if (stateBilling.sendData.limit !== 32) {
                    setStateBilling(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 32,
                            page: 1,
                        }
                    }))
                }
            },
        },
        {
            label: '64',
            key: '64',
            onClick: () => {
                if (stateBilling.sendData.limit !== 64) {
                    setStateBilling(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 64,
                            page: 1,
                        }
                    }))
                }
            },
        }
    ];

    // Обробники подій - ВИПРАВЛЕНО для роботи з вашим Input компонентом
    const onHandleChange = useCallback((name, value) => {
        setStateBilling(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }));
    }, []);

    const applyFilter = useCallback(() => {
        if (!hasOnlyAllowedParams(stateBilling.selectData, Object.keys(stateBilling.selectData))) {
            return;
        }

        const filteredSelectData = validateFilters(stateBilling.selectData);
        
        setStateBilling(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                ...filteredSelectData,
                page: 1
            },
            isFilterOpen: false  // Закриваємо фільтр
        }));
    }, [stateBilling.selectData]);

    const resetFilters = useCallback(() => {
        const emptySelectData = {
            parent_name: '',
            payment_month_from: '',
            payment_month_to: '',
            balance_min: '',
            balance_max: ''
        };

        setStateBilling(prevState => ({
            ...prevState,
            sendData: {
                page: 1,
                limit: 16,
                sort_by: 'payment_month',
                sort_direction: 'desc'
            },
            selectData: emptySelectData,
            isFilterOpen: false  // Закриваємо фільтр
        }));
    }, []);

    const openModal = useCallback(() => {
        setModalState({
            isOpen: true,
            loading: false,
            formData: {
                parent_name: '',
                payment_month: '',
                current_debt: '',
                current_accrual: '',
                current_payment: '',
                notes: ''
            }
        });
        document.body.style.overflow = 'hidden';
    }, []);

    const closeModal = useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'unset';
    }, []);

    const closeEditModal = useCallback(() => {
        setEditModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'unset';
    }, []);

    const closeDeleteModal = useCallback(() => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'unset';
    }, []);

    // ВИПРАВЛЕНІ обробники для модальних вікон
    const handleModalInputChange = useCallback((name, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    }, []);

    const handleEditModalInputChange = useCallback((name, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    }, []);

    const handleEdit = (record) => {
        // Правильне форматування дати для month input
        const paymentMonth = record.payment_month ? record.payment_month.substring(0, 7) : '';
        
        setEditModalState({
            isOpen: true,
            loading: false,
            itemId: record.id,
            formData: {
                parent_name: record.parent_name || '',
                payment_month: paymentMonth,
                current_debt: record.current_debt?.toString() || '',
                current_accrual: record.current_accrual?.toString() || '',
                current_payment: record.current_payment?.toString() || '',
                notes: record.notes || ''
            }
        });
        document.body.style.overflow = 'hidden';
    };

    const handleDelete = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            itemId: record.id,
            parentName: record.parent_name || 'Невідомо'
        });
        document.body.style.overflow = 'hidden';
    };

    // Функції для збереження
    const handleSave = async () => {
        setModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction('api/kindergarten/billing', {
                method: 'POST',
                data: {
                    parent_name: modalState.formData.parent_name,
                    payment_month: modalState.formData.payment_month + '-01', // add day for proper date format
                    current_debt: parseFloat(modalState.formData.current_debt || 0),
                    current_accrual: parseFloat(modalState.formData.current_accrual || 0),
                    current_payment: parseFloat(modalState.formData.current_payment || 0),
                    notes: modalState.formData.notes || null
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис батьківської плати успішно додано',
            });

            closeModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати запис батьківської плати',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleUpdate = async () => {
        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/billing/${editModalState.itemId}`, {
                method: 'PUT',
                data: {
                    parent_name: editModalState.formData.parent_name,
                    payment_month: editModalState.formData.payment_month + '-01', // add day for proper date format
                    current_debt: parseFloat(editModalState.formData.current_debt || 0),
                    current_accrual: parseFloat(editModalState.formData.current_accrual || 0),
                    current_payment: parseFloat(editModalState.formData.current_payment || 0),
                    notes: editModalState.formData.notes || null
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис батьківської плати успішно оновлено',
            });

            closeEditModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити запис батьківської плати',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleConfirmDelete = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/billing/${deleteModalState.itemId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис батьківської плати успішно видалено',
            });

            closeDeleteModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData
            });
        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити запис батьківської плати',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handlePageChange = useCallback((page) => {
        setStateBilling(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                page
            }
        }));
    }, []);

    if (status === STATUS.PENDING) {
        return <SkeletonPage />
    }

    if (status === STATUS.ERROR) {
        return <PageError statusError={error?.status} title={error?.message || 'Помилка завантаження'} />
    }

    const tableData = data?.items || data?.data || [];

    return (
        <React.Fragment>
            {status === STATUS.PENDING ? <SkeletonPage/> : null}
            {status === STATUS.SUCCESS ?
                <React.Fragment>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="title title--sm">
                                {tableData && Array.isArray(tableData) && tableData.length > 0 ?
                                    `Показує ${startRecord} з ${data?.totalItems || 1}`
                                    :
                                    "Записів не знайдено"
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Button
                                    onClick={openModal}
                                    icon={addIcon}>
                                    Додати запис
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    childStyle={childDropDownStyle}
                                    caption={`Записів: ${stateBilling.sendData.limit}`}
                                    menu={itemMenu}/>
                                <Button
                                    className={`table-filter-trigger ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={() => setStateBilling(prev => ({...prev, isFilterOpen: !prev.isFilterOpen}))}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateBilling.selectData).filter(key => stateBilling.selectData[key]).length})`}
                                </Button>

                                {/* Dropdown фільтр */}
                                {stateBilling.isFilterOpen && (
                                    <div className="table-filter" ref={filterDropdownRef}>
                                        <h3 className="title title--sm">Фільтри</h3>
                                        
                                        <div className="btn-group">
                                            <Button onClick={applyFilter}>Застосувати</Button>
                                            <Button className="btn--secondary" onClick={resetFilters}>
                                                Скинути
                                            </Button>
                                        </div>

                                        <div className="table-filter__item">
                                            <Input
                                                icon={searchIcon}
                                                name="parent_name"
                                                type="text"
                                                placeholder="Введіть ПІБ батьків"
                                                value={stateBilling.selectData.parent_name || ''}
                                                onChange={onHandleChange}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <Input
                                                name="payment_month_from"
                                                type="month"
                                                placeholder="Місяць від"
                                                value={stateBilling.selectData.payment_month_from || ''}
                                                onChange={onHandleChange}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <Input
                                                name="payment_month_to"
                                                type="month"
                                                placeholder="Місяць до"
                                                value={stateBilling.selectData.payment_month_to || ''}
                                                onChange={onHandleChange}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <Input
                                                name="balance_min"
                                                type="number"
                                                placeholder="Мін. сальдо"
                                                value={stateBilling.selectData.balance_min || ''}
                                                onChange={onHandleChange}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <Input
                                                name="balance_max"
                                                type="number"
                                                placeholder="Макс. сальдо"
                                                value={stateBilling.selectData.balance_max || ''}
                                                onChange={onHandleChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={tableData}
                            rowKey="id"
                            loading={status === STATUS.PENDING}/>
                        <Pagination 
                            total={data?.totalItems || 0}
                            current={stateBilling.sendData.page}
                            pageSize={stateBilling.sendData.limit}
                            onChange={handlePageChange}
                        />
                    </div>
                </React.Fragment>
                : null}

            {/* Модальне вікно додавання */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeModal}
                        onOk={handleSave}
                        confirmLoading={modalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Додати батьківську плату"
                    >
                        <div className="kindergarten-billing-modal">
                            <div className="form-section">
                                <label className="form-label">
                                    👤 ПІБ батьків <span className="required-mark">*</span>
                                </label>
                                <Input
                                    type="text"
                                    name="parent_name"
                                    value={modalState.formData.parent_name}
                                    onChange={handleModalInputChange}
                                    placeholder="Введіть ПІБ батьків"
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    📅 Місяць оплати <span className="required-mark">*</span>
                                </label>
                                <div className="month-input">
                                    <Input
                                        type="month"
                                        name="payment_month"
                                        value={modalState.formData.payment_month}
                                        onChange={handleModalInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-section--highlighted">
                                <label className="form-label">
                                    💰 Поточний борг (грн)
                                </label>
                                <div className="currency-input">
                                    <Input
                                        type="number"
                                        name="current_debt"
                                        value={modalState.formData.current_debt}
                                        onChange={handleModalInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="form-help">
                                    Борг з попередніх періодів
                                </p>
                            </div>

                            <div className="form-section--highlighted">
                                <label className="form-label">
                                    📊 Поточне нарахування (грн)
                                </label>
                                <div className="currency-input">
                                    <Input
                                        type="number"
                                        name="current_accrual"
                                        value={modalState.formData.current_accrual}
                                        onChange={handleModalInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="form-help">
                                    Нарахована сума за поточний місяць
                                </p>
                            </div>

                            <div className="form-section--highlighted">
                                <label className="form-label">
                                    💳 Поточна оплата (грн)
                                </label>
                                <div className="currency-input">
                                    <Input
                                        type="number"
                                        name="current_payment"
                                        value={modalState.formData.current_payment}
                                        onChange={handleModalInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="form-help">
                                    Сума, яку внесли батьки
                                </p>
                            </div>

                            <div className="form-section">
                                <label className="form-label">
                                    📝 Примітки
                                </label>
                                <Input
                                    type="text"
                                    name="notes"
                                    value={modalState.formData.notes}
                                    onChange={handleModalInputChange}
                                    placeholder="Додаткова інформація"
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно редагування */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeEditModal}
                        onOk={handleUpdate}
                        confirmLoading={editModalState.loading}
                        cancelText="Відхилити"
                        okText="Оновити"
                        title="Редагувати батьківську плату"
                    >
                        <div className="kindergarten-billing-modal">
                            <div className="form-section">
                                <label className="form-label">
                                    👤 ПІБ батьків <span className="required-mark">*</span>
                                </label>
                                <Input
                                    type="text"
                                    name="parent_name"
                                    value={editModalState.formData.parent_name}
                                    onChange={handleEditModalInputChange}
                                    placeholder="Введіть ПІБ батьків"
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <label className="form-label">
                                    📅 Місяць оплати <span className="required-mark">*</span>
                                </label>
                                <div className="month-input">
                                    <Input
                                        type="month"
                                        name="payment_month"
                                        value={editModalState.formData.payment_month}
                                        onChange={handleEditModalInputChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-section--highlighted">
                                <label className="form-label">
                                    💰 Поточний борг (грн)
                                </label>
                                <div className="currency-input">
                                    <Input
                                        type="number"
                                        name="current_debt"
                                        value={editModalState.formData.current_debt}
                                        onChange={handleEditModalInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="form-help">
                                    Борг з попередніх періодів
                                </p>
                            </div>

                            <div className="form-section--highlighted">
                                <label className="form-label">
                                    📊 Поточне нарахування (грн)
                                </label>
                                <div className="currency-input">
                                    <Input
                                        type="number"
                                        name="current_accrual"
                                        value={editModalState.formData.current_accrual}
                                        onChange={handleEditModalInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="form-help">
                                    Нарахована сума за поточний місяць
                                </p>
                            </div>

                            <div className="form-section--highlighted">
                                <label className="form-label">
                                    💳 Поточна оплата (грн)
                                </label>
                                <div className="currency-input">
                                    <Input
                                        type="number"
                                        name="current_payment"
                                        value={editModalState.formData.current_payment}
                                        onChange={handleEditModalInputChange}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="form-help">
                                    Сума, яку внесли батьки
                                </p>
                            </div>

                            <div className="form-section">
                                <label className="form-label">
                                    📝 Примітки
                                </label>
                                <Input
                                    type="text"
                                    name="notes"
                                    value={editModalState.formData.notes}
                                    onChange={handleEditModalInputChange}
                                    placeholder="Додаткова інформація"
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно видалення */}
            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeDeleteModal}
                        onOk={handleConfirmDelete}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Видалити"
                        title="Підтвердження видалення"
                        okButtonProps={{ className: 'danger' }}
                    >
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <p style={{ marginBottom: '16px', fontSize: '16px' }}>
                                Ви дійсно бажаєте видалити запис батьківської плати для:
                            </p>
                            <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#1890ff' }}>
                                {deleteModalState.parentName}?
                            </p>
                            <p style={{ marginTop: '16px', color: '#ff4d4f', fontSize: '14px' }}>
                                ⚠️ Цю дію неможливо відмінити!
                            </p>
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default KindergartenBilling;