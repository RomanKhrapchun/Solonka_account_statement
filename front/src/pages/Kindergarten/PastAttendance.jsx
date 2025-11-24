import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import classNames from 'classnames';
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, hasOnlyAllowedParams, validateFilters} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Input from "../../components/common/Input/Input";
import Select from "../../components/common/Select/Select";
import Button from "../../components/common/Button/Button";

// Іконки
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Константи для збереження стану
const PAST_ATTENDANCE_STATE_KEY = 'pastAttendanceState';

// Функція для отримання поточної дати України
const getCurrentUkraineDate = () => {
    const now = new Date();
    const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    return ukraineTime.toISOString().split('T')[0];
};

// Функція для отримання вчорашньої дати (для архівних відвідувань)
const getYesterdayUkraineDate = () => {
    const now = new Date();
    const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    ukraineTime.setDate(ukraineTime.getDate() - 1); // Віднімаємо 1 день
    return ukraineTime.toISOString().split('T')[0];
};

const saveAttendanceState = (state) => {
    try {
        const stateToSave = {
            isFilterOpen: state.isFilterOpen,
            selectData: state.selectData,
            sendData: state.sendData,
            savedDate: state.selectData.date || getYesterdayUkraineDate(),
            savedAt: new Date().toISOString()
        };
        sessionStorage.setItem(PAST_ATTENDANCE_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.warn('Failed to save past attendance state:', error);
    }
};

const loadAttendanceState = () => {
    try {
        const saved = sessionStorage.getItem(PAST_ATTENDANCE_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to load past attendance state:', error);
    }
    return null;
};

const clearAttendanceState = () => {
    try {
        sessionStorage.removeItem(PAST_ATTENDANCE_STATE_KEY);
        console.log('🗑️ Очищено sessionStorage для архівних відвідувань');
    } catch (error) {
        console.warn('Failed to clear past attendance state:', error);
    }
};

// Опції для статусів відвідуваності
const ATTENDANCE_STATUS_OPTIONS = [
    { value: 'present', label: 'Присутній(-я)' },
    { value: 'absent', label: 'Відсутній(-я)' },
    { value: 'sick', label: 'Хворий(-а)' },
    { value: 'vacation', label: 'Відпустка' }
];

const PastAttendance = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    
    // ⚠️ Для архівних відвідувань використовуємо вчорашню дату за замовчуванням
    // бо сьогоднішні дані ще в таблиці attendance, а past_attendance - це історія
    const initialDate = getYesterdayUkraineDate();
    
    const [stateAttendance, setStateAttendance] = useState(() => {
        const savedState = loadAttendanceState();
        const yesterdayDate = getYesterdayUkraineDate();
        
        if (savedState && savedState.savedDate) {
            console.log('✅ Використовуємо збережений стан для архівних відвідувань');
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || { date: yesterdayDate },
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'child_name',
                    sort_direction: 'asc',
                    date: yesterdayDate
                }
            };
        }
        
        console.log('🆕 Створюємо новий стан для архівних відвідувань з вчорашньою датою');
        return {
            isFilterOpen: false,
            selectData: { date: yesterdayDate },
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'child_name',
                sort_direction: 'asc',
                date: yesterdayDate
            }
        };
    });

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/past_attendance/filter', {
        method: 'post',
        data: stateAttendance.sendData
    })
    
    const startRecord = ((stateAttendance.sendData.page || 1) - 1) * stateAttendance.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateAttendance.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        console.log('📊 Поточний стан архівних відвідувань:', {
            selectData_date: stateAttendance.selectData.date,
            sendData_date: stateAttendance.sendData.date,
            yesterdayDate: getYesterdayUkraineDate()
        });
    }, [stateAttendance.selectData.date, stateAttendance.sendData.date]);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        console.log('🔄 Викликаємо API для архівних відвідувань з датою:', stateAttendance.sendData.date);
        retryFetch('api/kindergarten/past_attendance/filter', {
            method: 'post',
            data: stateAttendance.sendData
        });
    }, [stateAttendance.sendData, retryFetch]);

    useEffect(() => {
        saveAttendanceState(stateAttendance);
    }, [stateAttendance]);

    const getSortIcon = useCallback((columnName) => {
        if (stateAttendance.sendData.sort_by === columnName) {
            return stateAttendance.sendData.sort_direction === 'asc' ? sortUpIcon : sortDownIcon;
        }
        return null;
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction]);

    const handleSort = useCallback((columnName) => {
        const currentSort = stateAttendance.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateAttendance(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateAttendance.sendData]);

    const columns = useMemo(() => {
        const columns = [
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'child_name' ? 'active' : ''}`}
                        onClick={() => handleSort('child_name')}
                    >
                        <span>ПІБ дитини</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('child_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'child_name',
                key: 'child_name',
                sorter: false,
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'group_name' ? 'active' : ''}`}
                        onClick={() => handleSort('group_name')}
                    >
                        <span>Група</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('group_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'group_name',
                key: 'group_name',
                sorter: false,
            },
            {
                title: 'Садочок',
                dataIndex: 'kindergarten_name',
                key: 'kindergarten_name',
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAttendance.sendData.sort_by === 'date' ? 'active' : ''}`}
                        onClick={() => handleSort('date')}
                    >
                        <span>Дата</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('date')}
                        </div>
                    </div>
                ),
                dataIndex: 'attendance_date',
                key: 'attendance_date',
                render: (date) => {
                    if (!date) return '-';
                    const dateObj = new Date(date);
                    return dateObj.toLocaleDateString('uk-UA');
                }
            },
            {
                title: 'Присутність',
                dataIndex: 'attendance_status',
                key: 'attendance_status',
                render: (status) => {
                    const statusConfig = {
                        present: { color: '#52c41a', label: 'Присутній(-я)' },
                        absent: { color: '#f5222d', label: 'Відсутній(-я)' },
                        sick: { color: '#faad14', label: 'Хворий(-а)' },
                        vacation: { color: '#1890ff', label: 'Відпустка' }
                    };
                    
                    const config = statusConfig[status] || statusConfig.absent;
                    
                    return (
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ 
                                color: config.color, 
                                fontWeight: '600'
                            }}>
                                {config.label}
                            </span>
                        </div>
                    );
                }
            },
            // ⚠️ НЕМАЄ КОЛОНКИ "ДІЯ" - це архівні дані тільки для перегляду
        ];
        return columns;
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction, stateAttendance.sendData.date, stateAttendance.selectData.date]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            const defaultDate = stateAttendance.sendData.date 
                || stateAttendance.selectData.date 
                || getYesterdayUkraineDate();
            
            return data.items.map((el) => ({
                key: `${el.id}`,
                child_id: el.child_id,
                child_name: el.child_name,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                attendance_status: el.attendance_status || 'absent',
                attendance_date: el.date || defaultDate
            }));
        }
        return [];
    }, [data, stateAttendance.sendData.date, stateAttendance.selectData.date]);

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateAttendance.sendData.limit !== 16) {
                    setStateAttendance(prevState => ({
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
                if (stateAttendance.sendData.limit !== 32) {
                    setStateAttendance(prevState => ({
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
                if (stateAttendance.sendData.limit !== 48) {
                    setStateAttendance(prevState => ({
                        ...prevState,
                        sendData: {
                            ...prevState.sendData,
                            limit: 48,
                            page: 1,
                        }
                    }))
                }
            },
        }
    ];

    const filterHandleClick = () => {
        setStateAttendance(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.keys(stateAttendance.selectData).some(key => {
            if (key === 'date') return false;
            return stateAttendance.selectData[key] !== undefined && 
                   stateAttendance.selectData[key] !== null && 
                   stateAttendance.selectData[key] !== '';
        });
    }, [stateAttendance.selectData]);

    const handleInputChange = useCallback((name, value) => {
        setStateAttendance(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            }
        }))
    }, [])

    const handleDateChange = useCallback((name, value) => {
        console.log('📅 Зміна дати на:', value);
        setStateAttendance(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value
            },
            sendData: {
                ...prevState.sendData,
                [name]: value,
                page: 1
            }
        }))
    }, [])

    const handleFilterSearch = useCallback(() => {
        const allowedFilters = ['child_name', 'group_name', 'kindergarten_name', 'attendance_status', 'date'];
        const { isValid, errors } = validateFilters(stateAttendance.selectData, allowedFilters);

        if (!isValid) {
            notification({type: 'error', title: 'Помилка фільтрації', message: errors[0]});
            return;
        }
        
        const validatedData = hasOnlyAllowedParams(stateAttendance.selectData, allowedFilters);
        
        setStateAttendance(prevState => ({
            ...prevState,
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: prevState.sendData.sort_by,
                sort_direction: prevState.sendData.sort_direction,
                ...validatedData,
            },
            isFilterOpen: false,
        }));
    }, [stateAttendance.selectData, notification]);

    const handleClearFilter = useCallback(() => {
        const yesterdayDate = getYesterdayUkraineDate();
        console.log('🧹 Очищення фільтрів, повернення до вчорашньої дати:', yesterdayDate);
        
        clearAttendanceState();
        
        setStateAttendance({
            isFilterOpen: false,
            selectData: { date: yesterdayDate },
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'child_name',
                sort_direction: 'asc',
                date: yesterdayDate
            }
        });
    }, []);

    const onPageChange = useCallback((page) => {
        if (stateAttendance.sendData.page !== page) {
            setStateAttendance(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateAttendance.sendData.page])

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    return (
        <>
            {status === STATUS.PENDING && <SkeletonPage />}

            {status === STATUS.SUCCESS && (
                <>
                    <div className="table-elements">
                        <div className="table-header">
                            <h2 className="table-header__quantity">
                                {data?.items?.length ? (
                                    <>
                                        Показує {startRecord !== endRecord ? 
                                            `${startRecord} – ${endRecord}` : 
                                            startRecord
                                        } з {data?.totalItems || 0} записів
                                    </>
                                ) : (
                                    <>Показує 0 – 0 з 0 записів</>
                                )}
                            </h2>
                            <div className="table-header__buttons">
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    caption={`Записів: ${stateAttendance.sendData.limit}`}
                                    menu={itemMenu}
                                />
                                <Button
                                    className={classNames("table-filter-trigger", {
                                        "has-active-filters": hasActiveFilters
                                    })}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}
                                >
                                    Фільтри
                                </Button>
                            </div>
                        </div>
                        <div className="table-main">
                            <div 
                                style={{width: data?.items?.length > 0 ? 'auto' : '100%'}} 
                                className={classNames("table-and-pagination-wrapper", {
                                    "table-and-pagination-wrapper--active": stateAttendance.isFilterOpen
                                })}
                            >
                                <div style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 10 ? '1200px' : 'auto'
                                }}>
                                    <Table columns={columns} dataSource={tableData}/>
                                </div>
                                <Pagination
                                    className="m-b"
                                    currentPage={parseInt(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateAttendance.sendData.limit}
                                    onPageChange={onPageChange}
                                />
                            </div>
                            <div className={`table-filter ${stateAttendance.isFilterOpen ? "table-filter--active" : ""}`}>
                                <h3 className="title title--sm">Фільтри</h3>
                                <div className="btn-group">
                                    <Button onClick={handleFilterSearch}>
                                        Застосувати
                                    </Button>
                                    <Button className="btn--secondary" onClick={handleClearFilter}>
                                        Скинути
                                    </Button>
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">Дата</h4>
                                    <Input
                                        type="date"
                                        value={stateAttendance.selectData.date || ''}
                                        onChange={(value) => handleDateChange('date', value)}
                                    />
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">ПІБ дитини</h4>
                                    <Input
                                        placeholder="Введіть ПІБ"
                                        prefix={searchIcon}
                                        value={stateAttendance.selectData.child_name || ''}
                                        onChange={(value) => handleInputChange('child_name', value)}
                                    />
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">Група</h4>
                                    <Input
                                        placeholder="Введіть назву групи"
                                        prefix={searchIcon}
                                        value={stateAttendance.selectData.group_name || ''}
                                        onChange={(value) => handleInputChange('group_name', value)}
                                    />
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">Садочок</h4>
                                    <Input
                                        placeholder="Введіть назву садочка"
                                        prefix={searchIcon}
                                        value={stateAttendance.selectData.kindergarten_name || ''}
                                        onChange={(value) => handleInputChange('kindergarten_name', value)}
                                    />
                                </div>
                                <div className="table-filter__item">
                                    <h4 className="input-description">Статус відвідуваності</h4>
                                    <Select
                                        value={stateAttendance.selectData.attendance_status || ''}
                                        onChange={(value) => handleInputChange('attendance_status', value)}
                                        options={ATTENDANCE_STATUS_OPTIONS}
                                        placeholder="Оберіть статус"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default PastAttendance;