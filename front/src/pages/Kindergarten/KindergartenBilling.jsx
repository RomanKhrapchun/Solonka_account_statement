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
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "./KindergartenBilling.css";

// Іконки
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 20, 20)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 20, 20)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const uploadIcon = generateIcon(iconMap.upload, null, 'currentColor', 20, 20)
const dropDownStyle = {width: '100%'}

const BILLING_STATE_KEY = 'kindergartenBillingState';

const saveBillingState = (state) => {
    try {
        sessionStorage.setItem(BILLING_STATE_KEY, JSON.stringify({
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Failed to save billing state:', error);
    }
};

const loadBillingState = () => {
    try {
        const saved = sessionStorage.getItem(BILLING_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load billing state:', error);
    }
    return null;
};

const clearBillingState = () => {
    try {
        sessionStorage.removeItem(BILLING_STATE_KEY);
    } catch (error) {
        console.warn('Failed to clear billing state:', error);
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
    const pdfModalNodeRef = useRef(null)
    const duplicateModalNodeRef = useRef(null)
    
    const [stateBilling, setStateBilling] = useState(() => {
        const savedState = loadBillingState();
        
        if (savedState) {
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || {},
                confirmLoading: false,
                itemId: null,
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'payment_month',
                    sort_direction: 'desc',
                }
            };
        }
        
        return {
            isFilterOpen: false,
            selectData: {},
            confirmLoading: false,
            itemId: null,
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'payment_month',
                sort_direction: 'desc',
            }
        };
    });

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

    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        billingId: null,
        formData: {
            parent_name: '',
            payment_month: '',
            current_debt: '',
            current_accrual: '',
            current_payment: '',
            notes: ''
        }
    });

    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false,
        loading: false,
        billingId: null,
        parentName: '',
        paymentMonth: ''
    });

    const [pdfModalState, setPdfModalState] = useState({
        isOpen: false,
        loading: false,
        file: null,
        parsedData: null
    });

    const [duplicateModalState, setDuplicateModalState] = useState({
        isOpen: false,
        existingData: null,
        newData: null
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

    useEffect(() => {
        saveBillingState(stateBilling);
    }, [stateBilling]);

    useEffect(() => {
        return () => {
            clearBillingState();
        };
    }, []);

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
            headerClassName: isActive ? 'active-sort' : '',
            render,
            width
        };
    };

    const handleSort = (dataIndex) => {
        setStateBilling(prevState => {
            const isSameField = prevState.sendData.sort_by === dataIndex;
            const newDirection = isSameField && prevState.sendData.sort_direction === 'asc' ? 'desc' : 'asc';
            
            return {
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    sort_by: dataIndex,
                    sort_direction: newDirection,
                    page: 1
                }
            };
        });
    };

    const columnTable = useMemo(() => [
        createSortableColumn('ПІБ батьків', 'parent_name', null, '200px'),
        createSortableColumn('Місяць оплати', 'payment_month', (value) => {
            if (!value) return '-';
            
            try {
                if (value.match(/^\d{4}-\d{2}$/)) {
                    const [year, month] = value.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    return date.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' });
                }
                
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' });
                }
                
                return value;
            } catch (error) {
                console.error('Date parse error:', error);
                return value;
            }
        }, '150px'),
        createSortableColumn('Борг', 'current_debt', (value) => {
            return `${parseFloat(value || 0).toFixed(2)} ₴`;
        }, '120px'),
        createSortableColumn('Нараховання', 'current_accrual', (value) => {
            return `${parseFloat(value || 0).toFixed(2)} ₴`;
        }, '120px'),
        createSortableColumn('Оплачено', 'current_payment', (value) => {
            return `${parseFloat(value || 0).toFixed(2)} ₴`;
        }, '120px'),
        {
            title: 'Сальдо',
            dataIndex: 'balance',
            width: '120px',
            render: (value) => {
                const balance = parseFloat(value || 0);
                const className = balance > 0 ? 'balance-positive' : 
                                balance < 0 ? 'balance-negative' : 
                                'balance-zero';
                return <span className={className}>{balance.toFixed(2)} ₴</span>;
            }
        },
        {
            title: 'Дія',
            dataIndex: 'action',
            width: '120px',
            render: (_, record) => (
                <div className="actions-group">
                    <Button
                        title="Редагувати"
                        icon={editIcon}
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        title="Видалити"
                        icon={deleteIcon}
                        onClick={() => openDeleteModal(record)}
                    />
                </div>
            ),
        },
    ], [stateBilling.sendData.sort_by, stateBilling.sendData.sort_direction]);
    
    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                parent_name: el.parent_name,
                payment_month: el.payment_month,
                current_debt: el.current_debt,
                current_accrual: el.current_accrual,
                current_payment: el.current_payment,
                balance: el.balance,
                notes: el.notes
            }))
        }
        return []
    }, [data])

    const menuItems = [
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
            label: '48',
            key: '48',
            onClick: () => {
                if (stateBilling.sendData.limit !== 48) {
                    setStateBilling(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 48,
                            page: 1,
                        }
                    }))
                }
            },
        },
    ]

    const filterHandleClick = () => {
        setStateBilling(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const closeFilterDropdown = () => {
        setStateBilling(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateBilling.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value !== null && value !== undefined && value !== ''
        })
    }, [stateBilling.selectData])

    const onHandleChange = (name, value) => {
        setStateBilling(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        if (Object.values(stateBilling.selectData).some(Boolean)) {
            setStateBilling((prev) => ({ ...prev, selectData: {} }));
        }
        if (!hasOnlyAllowedParams(stateBilling.sendData, ['limit', 'page', 'sort_by', 'sort_direction'])) {
            setStateBilling((prev) => ({
                ...prev,
                sendData: { 
                    limit: prev.sendData.limit, 
                    page: 1,
                    sort_by: 'payment_month',
                    sort_direction: 'desc'
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateBilling.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateBilling.selectData);
        if (!validation.error) {
            setStateBilling((prev) => ({
                ...prev,
                sendData: { 
                    ...prev.sendData,
                    ...validation, 
                    page: 1,
                },
                isFilterOpen: false
            }));
        } else {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: validation.message ?? 'Щось пішло не так.',
            });
        }
    };

    const onPageChange = useCallback((page) => {
        if (stateBilling.sendData.page !== page) {
            setStateBilling(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateBilling.sendData.page])

    const openModal = () => {
        setModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                parent_name: '',
                payment_month: '',
                current_debt: '',
                current_accrual: '',
                current_payment: '',
                notes: ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleModalInputChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }));
    };

    const handleSaveBilling = async () => {
        const { parent_name, payment_month, current_debt, current_accrual, current_payment } = modalState.formData;
        
        if (!parent_name.trim() || !payment_month) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, заповніть обов\'язкові поля',
            });
            return;
        }

        setModalState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch('/api/kindergarten/billing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${store.token}`
                },
                body: JSON.stringify({
                    parent_name: parent_name.trim(),
                    payment_month,
                    current_debt: parseFloat(current_debt || 0),
                    current_accrual: parseFloat(current_accrual || 0),
                    current_payment: parseFloat(current_payment || 0),
                    notes: modalState.formData.notes || null
                })
            });

            const result = await response.json();

            // ✅ Перевірка на дублікат
            if (response.status === 409 && result.error === 'DUPLICATE_BILLING' && result.existingData) {
                console.log('🔍 Duplicate found:', result.existingData);
                
                setModalState(prev => ({ ...prev, loading: false }));
                
                setDuplicateModalState({
                    isOpen: true,
                    existingData: result.existingData,
                    newData: {
                        parent_name: parent_name.trim(),
                        payment_month,
                        current_debt: parseFloat(current_debt || 0),
                        current_accrual: parseFloat(current_accrual || 0),
                        current_payment: parseFloat(current_payment || 0),
                        notes: modalState.formData.notes || null
                    }
                });
                return;
            }

            if (!response.ok) {
                throw new Error(result.message || 'Не вдалося додати запис');
            }

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис успішно додано',
            });

            closeModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData,
            });

        } catch (error) {
            console.error('❌ Save error:', error);
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося додати запис',
            });
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const handleEdit = (record) => {
        setEditModalState({
            isOpen: true,
            loading: false,
            billingId: record.id,
            formData: {
                parent_name: record.parent_name,
                payment_month: record.payment_month,
                current_debt: record.current_debt,
                current_accrual: record.current_accrual,
                current_payment: record.current_payment,
                notes: record.notes || ''
            }
        });
        document.body.style.overflow = 'hidden';
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleEditInputChange = (field, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value
            }
        }));
    };

    const handleUpdateBilling = async () => {
        const { parent_name, payment_month, current_debt, current_accrual, current_payment } = editModalState.formData;
        
        if (!parent_name.trim() || !payment_month) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, заповніть обов\'язкові поля',
            });
            return;
        }

        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/billing/${editModalState.billingId}`, {
                method: 'PUT',
                data: {
                    parent_name: parent_name.trim(),
                    payment_month,
                    current_debt: parseFloat(current_debt || 0),
                    current_accrual: parseFloat(current_accrual || 0),
                    current_payment: parseFloat(current_payment || 0),
                    notes: editModalState.formData.notes || null
                }
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис успішно оновлено',
            });

            closeEditModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити запис',
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    const openDeleteModal = (record) => {
        setDeleteModalState({
            isOpen: true,
            loading: false,
            billingId: record.id,
            parentName: record.parent_name,
            paymentMonth: record.payment_month
        });
        document.body.style.overflow = 'hidden';
    };

    const closeDeleteModal = () => {
        setDeleteModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleDeleteBilling = async () => {
        setDeleteModalState(prev => ({ ...prev, loading: true }));

        try {
            await fetchFunction(`api/kindergarten/billing/${deleteModalState.billingId}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис успішно видалено',
            });

            closeDeleteModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити запис',
            });
        } finally {
            setDeleteModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // PDF ФУНКЦІЇ
    const openPdfModal = () => {
        setPdfModalState({
            isOpen: true,
            loading: false,
            file: null,
            parsedData: null
        });
        document.body.style.overflow = 'hidden';
    };

    const closePdfModal = () => {
        setPdfModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfModalState(prev => ({
                ...prev,
                file: file,
                parsedData: null
            }));
        } else {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, завантажте PDF файл',
            });
        }
    };

    const handleParsePDF = async () => {
        if (!pdfModalState.file) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, оберіть файл',
            });
            return;
        }

        setPdfModalState(prev => ({ ...prev, loading: true }));

        try {
            const formData = new FormData();
            formData.append('file', pdfModalState.file);

            const response = await fetch('/api/kindergarten/billing/parse-pdf', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${store.token}`
                },
                body: formData
            });

            const result = await response.json();

            if (result.success && result.data) {
                setPdfModalState(prev => ({
                    ...prev,
                    loading: false,
                    parsedData: result.data
                }));

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: 'Дані успішно зчитано з квитанції',
                });
            } else {
                throw new Error(result.error || 'Не вдалося розпізнати дані');
            }

        } catch (error) {
            setPdfModalState(prev => ({ ...prev, loading: false }));
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося обробити PDF',
            });
        }
    };

    const handleUseParsedData = () => {
        if (!pdfModalState.parsedData) return;

        const data = pdfModalState.parsedData;
        
        let paymentMonth = '';
        if (data.payment_month) {
            const monthNames = {
                'Січень': '01', 'січень': '01',
                'Лютий': '02', 'лютий': '02',
                'Березень': '03', 'березень': '03',
                'Квітень': '04', 'квітень': '04',
                'Травень': '05', 'травень': '05',
                'Червень': '06', 'червень': '06',
                'Липень': '07', 'липень': '07',
                'Серпень': '08', 'серпень': '08',
                'Вересень': '09', 'вересень': '09',
                'Жовтень': '10', 'жовтень': '10',
                'Листопад': '11', 'листопад': '11',
                'Грудень': '12', 'грудень': '12'
            };

            const parts = data.payment_month.trim().split(/\s+/);
            const monthName = parts[0];
            const year = parts[1];
            
            if (monthNames[monthName] && year) {
                paymentMonth = `${year}-${monthNames[monthName]}`;
            }
        }

        setModalState({
            isOpen: true,
            loading: false,
            formData: {
                parent_name: data.parent_name || '',
                payment_month: paymentMonth,
                current_debt: data.current_debt || 0,
                current_accrual: data.current_accrual || 0,
                current_payment: data.current_payment || 0,
                notes: 'Створено з квитанції'
            }
        });

        closePdfModal();
    };

    // DUPLICATE ФУНКЦІЇ
    const closeDuplicateModal = () => {
        setDuplicateModalState(prev => ({ ...prev, isOpen: false }));
    };

    const handleReplaceExisting = async () => {
        const { existingData, newData } = duplicateModalState;
        
        try {
            await fetchFunction(`api/kindergarten/billing/${existingData.id}`, {
                method: 'PUT',
                data: newData
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Запис успішно замінено',
            });

            closeDuplicateModal();
            closeModal();
            
            retryFetch('api/kindergarten/billing/filter', {
                method: 'post',
                data: stateBilling.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося замінити запис',
            });
        }
    };

    const handleKeepBoth = () => {
        notification({
            type: 'info',
            placement: 'top',
            title: 'Інформація',
            message: 'Змініть місяць або ПІБ для додавання нового запису',
        });
        closeDuplicateModal();
    };

    if (status === STATUS.PENDING) {
        return <SkeletonPage />
    }

    if (status === STATUS.ERROR) {
        return <PageError statusError={error?.status} title={error?.message || 'Помилка завантаження'} />
    }

    return (
        <React.Fragment>
            {status === STATUS.PENDING ? <SkeletonPage/> : null}
            {status === STATUS.SUCCESS ?
                <React.Fragment>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="table-header__quantity">
                                {tableData && Array.isArray(tableData) && tableData.length > 0 ?
                                    <React.Fragment>
                                        Показує {startRecord !== endRecord ?
                                        `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 0}
                                    </React.Fragment> :
                                    'Батьківська плата'
                                }
                            </h2>
                            <div className="table-header__buttons">
                                <Button
                                    onClick={openModal}
                                    icon={addIcon}>
                                    Додати запис
                                </Button>
                                <Button
                                    onClick={openPdfModal}
                                    icon={uploadIcon}
                                    className="btn--secondary">
                                    Додати з квитанції
                                </Button>
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    caption={`Записів: ${stateBilling.sendData.limit}`}
                                    menu={menuItems}
                                />
                                <Button
                                    className={`btn btn--filter ${hasActiveFilters ? 'has-active-filters' : ''}`}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}>
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateBilling.selectData).filter(key => stateBilling.selectData[key]).length})`}
                                </Button>

                                <FilterDropdown
                                    isOpen={stateBilling.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateBilling.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                />
                            </div>
                        </div>
                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 0 ? '1000px' : 'auto'
                                }}>
                                    <Table columns={columnTable} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateBilling.sendData.limit}
                                    onPageChange={onPageChange}/>
                            </div>
                        </div>
                    </div>
                </React.Fragment> : null
            }

            {/* Модальне вікно для додавання */}
            <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                {state => (
                    <Modal
                        ref={modalNodeRef}
                        className={`modal-window-wrapper kindergarten-billing-modal ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeModal}
                        onOk={handleSaveBilling}
                        confirmLoading={modalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Додати запис батьківської плати"
                    >
                        <div className="modal-form">
                            <div className="form-section">
                                <Input
                                    label="ПІБ батька"
                                    placeholder="Введіть ПІБ"
                                    name="parent_name"
                                    value={modalState.formData.parent_name}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <Input
                                    type="month"
                                    label="Місяць оплати"
                                    name="payment_month"
                                    value={modalState.formData.payment_month}
                                    onChange={handleModalInputChange}
                                    required
                                />
                            </div>

                            <div className="form-section form-section--highlighted">
                                <Input
                                    type="number"
                                    step="0.01"
                                    label="Борг (₴)"
                                    placeholder="0.00"
                                    name="current_debt"
                                    value={modalState.formData.current_debt}
                                    onChange={handleModalInputChange}
                                />
                            </div>

                            <div className="form-section form-section--highlighted">
                                <Input
                                    type="number"
                                    step="0.01"
                                    label="Нараховання (₴)"
                                    placeholder="0.00"
                                    name="current_accrual"
                                    value={modalState.formData.current_accrual}
                                    onChange={handleModalInputChange}
                                />
                            </div>

                            <div className="form-section form-section--highlighted">
                                <Input
                                    type="number"
                                    step="0.01"
                                    label="Оплачено (₴)"
                                    placeholder="0.00"
                                    name="current_payment"
                                    value={modalState.formData.current_payment}
                                    onChange={handleModalInputChange}
                                />
                            </div>

                            <div className="form-section">
                                <Input
                                    label="Примітки"
                                    placeholder="Додаткова інформація"
                                    name="notes"
                                    value={modalState.formData.notes}
                                    onChange={handleModalInputChange}
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для редагування */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editModalNodeRef}>
                {state => (
                    <Modal
                        ref={editModalNodeRef}
                        className={`modal-window-wrapper kindergarten-billing-modal ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeEditModal}
                        onOk={handleUpdateBilling}
                        confirmLoading={editModalState.loading}
                        cancelText="Відхилити"
                        okText="Зберегти"
                        title="Редагувати запис"
                    >
                        <div className="modal-form">
                            <div className="form-section">
                                <Input
                                    label="ПІБ батька"
                                    placeholder="Введіть ПІБ"
                                    name="parent_name"
                                    value={editModalState.formData.parent_name}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-section">
                                <Input
                                    type="month"
                                    label="Місяць оплати"
                                    name="payment_month"
                                    value={editModalState.formData.payment_month}
                                    onChange={handleEditInputChange}
                                    required
                                />
                            </div>

                            <div className="form-section form-section--highlighted">
                                <Input
                                    type="number"
                                    step="0.01"
                                    label="Борг (₴)"
                                    placeholder="0.00"
                                    name="current_debt"
                                    value={editModalState.formData.current_debt}
                                    onChange={handleEditInputChange}
                                />
                            </div>

                            <div className="form-section form-section--highlighted">
                                <Input
                                    type="number"
                                    step="0.01"
                                    label="Нараховання (₴)"
                                    placeholder="0.00"
                                    name="current_accrual"
                                    value={editModalState.formData.current_accrual}
                                    onChange={handleEditInputChange}
                                />
                            </div>

                            <div className="form-section form-section--highlighted">
                                <Input
                                    type="number"
                                    step="0.01"
                                    label="Оплачено (₴)"
                                    placeholder="0.00"
                                    name="current_payment"
                                    value={editModalState.formData.current_payment}
                                    onChange={handleEditInputChange}
                                />
                            </div>

                            <div className="form-section">
                                <Input
                                    label="Примітки"
                                    placeholder="Додаткова інформація"
                                    name="notes"
                                    value={editModalState.formData.notes}
                                    onChange={handleEditInputChange}
                                />
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для видалення */}
            <Transition in={deleteModalState.isOpen} timeout={200} unmountOnExit nodeRef={deleteModalNodeRef}>
                {state => (
                    <Modal
                        ref={deleteModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeDeleteModal}
                        onOk={handleDeleteBilling}
                        confirmLoading={deleteModalState.loading}
                        cancelText="Скасувати"
                        okText="Видалити"
                        title="Підтвердження видалення"
                    >
                        <p>
                            Ви впевнені, що хочете видалити запис для <strong>{deleteModalState.parentName}</strong> за <strong>{deleteModalState.paymentMonth}</strong>?
                        </p>
                    </Modal>
                )}
            </Transition>

            {/* Модалка для PDF */}
            <Transition in={pdfModalState.isOpen} timeout={200} unmountOnExit nodeRef={pdfModalNodeRef}>
                {state => (
                    <Modal
                        ref={pdfModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closePdfModal}
                        onOk={pdfModalState.parsedData ? handleUseParsedData : handleParsePDF}
                        confirmLoading={pdfModalState.loading}
                        cancelText="Скасувати"
                        okText={pdfModalState.parsedData ? "Використати дані" : "Зчитати"}
                        title="Завантажити квитанцію"
                    >
                        <div className="modal-form">
                            <div className="form-section">
                                <label className="form-label">
                                    Оберіть PDF файл квитанції
                                </label>
                                
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    id="pdf-file-input"
                                    style={{ display: 'none' }}
                                />
                                
                                <label
                                    htmlFor="pdf-file-input"
                                    style={{
                                        display: 'inline-block',
                                        padding: '12px 24px',
                                        background: '#1890ff',
                                        color: 'white',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'all 0.3s',
                                        textAlign: 'center',
                                        border: 'none',
                                        marginBottom: '12px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#40a9ff'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#1890ff'}
                                >
                                    📄 Обрати PDF файл
                                </label>
                                
                                {pdfModalState.file && (
                                    <div style={{
                                        padding: '12px',
                                        background: '#f6ffed',
                                        border: '1px solid #b7eb8f',
                                        borderRadius: '6px',
                                        marginTop: '8px'
                                    }}>
                                        <p style={{ margin: 0, color: '#52c41a', fontSize: '14px', fontWeight: '500' }}>
                                            ✓ Файл обрано: {pdfModalState.file.name}
                                        </p>
                                        <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '12px' }}>
                                            Розмір: {(pdfModalState.file.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                )}
                            </div>

                            {pdfModalState.parsedData && (
                                <div className="form-section" style={{
                                    background: '#f0f9ff',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #bae6fd',
                                    marginTop: '16px'
                                }}>
                                    <h4 style={{ marginBottom: '12px', color: '#0369a1', fontSize: '16px' }}>
                                        Зчитані дані:
                                    </h4>
                                    <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                                        <p style={{ marginBottom: '8px' }}>
                                            <strong>ПІБ:</strong> {pdfModalState.parsedData.parent_name}
                                        </p>
                                        <p style={{ marginBottom: '8px' }}>
                                            <strong>Борг:</strong> {pdfModalState.parsedData.current_debt} ₴
                                        </p>
                                        <p style={{ marginBottom: '8px' }}>
                                            <strong>Нараховано:</strong> {pdfModalState.parsedData.current_accrual} ₴
                                        </p>
                                        <p style={{ marginBottom: '8px' }}>
                                            <strong>Оплачено:</strong> {pdfModalState.parsedData.current_payment} ₴
                                        </p>
                                        <p style={{ marginBottom: 0 }}>
                                            <strong>Місяць:</strong> {pdfModalState.parsedData.payment_month}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модалка попередження про дублікат */}
            <Transition in={duplicateModalState.isOpen} timeout={200} unmountOnExit nodeRef={duplicateModalNodeRef}>
                {state => (
                    <Modal
                        ref={duplicateModalNodeRef}
                        className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                        onClose={closeDuplicateModal}
                        title="⚠️ Запис вже існує"
                        footer={null}
                    >
                        <div style={{ padding: '20px' }}>
                            <p style={{ fontSize: '16px', marginBottom: '20px', fontWeight: '500' }}>
                                Запис для <strong>{duplicateModalState.existingData?.parent_name}</strong> за цей місяць вже існує:
                            </p>
                            
                            <div style={{
                                background: '#f0f9ff',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                border: '1px solid #bae6fd'
                            }}>
                                <h4 style={{ marginBottom: '12px', color: '#0369a1' }}>Існуючий запис:</h4>
                                <p><strong>Борг:</strong> {duplicateModalState.existingData?.current_debt ?? 0} ₴</p>
                                <p><strong>Нараховано:</strong> {duplicateModalState.existingData?.current_accrual ?? 0} ₴</p>
                                <p><strong>Оплачено:</strong> {duplicateModalState.existingData?.current_payment ?? 0} ₴</p>
                                <p><strong>Сальдо:</strong> {duplicateModalState.existingData?.balance ?? 0} ₴</p>
                            </div>

                            <div style={{
                                background: '#f0fdf4',
                                padding: '16px',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                border: '1px solid #bbf7d0'
                            }}>
                                <h4 style={{ marginBottom: '12px', color: '#15803d' }}>Нові дані:</h4>
                                <p><strong>Борг:</strong> {duplicateModalState.newData?.current_debt} ₴</p>
                                <p><strong>Нараховано:</strong> {duplicateModalState.newData?.current_accrual} ₴</p>
                                <p><strong>Оплачено:</strong> {duplicateModalState.newData?.current_payment} ₴</p>
                            </div>

                            <p style={{ marginBottom: '20px', color: '#666' }}>
                                Що ви хочете зробити?
                            </p>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <Button onClick={handleKeepBoth}>
                                    Залишити старий
                                </Button>
                                <Button 
                                    onClick={handleReplaceExisting}
                                    className="btn--primary"
                                    style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                                    Замінити на новий
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </React.Fragment>
    );
};

export default KindergartenBilling;