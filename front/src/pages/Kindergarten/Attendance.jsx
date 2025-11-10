import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import classNames from 'classnames';
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
import {Transition} from "react-transition-group";
import Input from "../../components/common/Input/Input";
import Select from "../../components/common/Select/Select";
import FilterDropdown from "../../components/common/Dropdown/FilterDropdown";
import "../../components/common/Dropdown/FilterDropdown.css";

// Іконки
const checkIcon = generateIcon(iconMap.check, null, 'currentColor', 16, 16)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const searchIcon = generateIcon(iconMap.search, 'input-icon', 'currentColor', 16, 16)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Константи для збереження стану
const ATTENDANCE_STATE_KEY = 'attendanceState';

// ✅ Функція для отримання поточної дати України
const getCurrentUkraineDate = () => {
    const now = new Date();
    const ukraineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
    const year = ukraineTime.getFullYear();
    const month = String(ukraineTime.getMonth() + 1).padStart(2, '0');
    const day = String(ukraineTime.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    console.log('🗓️ getCurrentUkraineDate:', dateString);
    return dateString;
};

const saveAttendanceState = (state) => {
    try {
        const dataToSave = {
            sendData: state.sendData,
            selectData: state.selectData,
            isFilterOpen: state.isFilterOpen,
            timestamp: Date.now(),
            savedDate: getCurrentUkraineDate() // Зберігаємо дату збереження
        };
        sessionStorage.setItem(ATTENDANCE_STATE_KEY, JSON.stringify(dataToSave));
        console.log('💾 Збережено стан з датою:', dataToSave.savedDate);
    } catch (error) {
        console.warn('Failed to save attendance state:', error);
    }
};

const loadAttendanceState = () => {
    try {
        const saved = sessionStorage.getItem(ATTENDANCE_STATE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const currentDate = getCurrentUkraineDate();
            
            console.log('📂 Завантажено стан:', {
                savedDate: parsed.savedDate,
                currentDate: currentDate,
                needsUpdate: parsed.savedDate !== currentDate
            });
            
            // ✅ КРИТИЧНО: Якщо збережена дата не співпадає з поточною - НЕ завантажуємо старий стан
            if (parsed.savedDate && parsed.savedDate !== currentDate) {
                console.log('⚠️ Дата застаріла, очищуємо sessionStorage');
                sessionStorage.removeItem(ATTENDANCE_STATE_KEY);
                return null;
            }
            
            // Перевіряємо чи дані не старіші 30 хвилин
            if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch (error) {
        console.warn('Failed to load attendance state:', error);
    }
    return null;
};

const clearAttendanceState = () => {
    try {
        sessionStorage.removeItem(ATTENDANCE_STATE_KEY);
        console.log('🗑️ Очищено sessionStorage');
    } catch (error) {
        console.warn('Failed to clear attendance state:', error);
    }
};

// Опції для статусів відвідуваності
const ATTENDANCE_STATUS_OPTIONS = [
    { value: 'present', label: 'Присутній(-я)' },
    { value: 'absent', label: 'Відсутній(-я)' },
    { value: 'sick', label: 'Хворий(-а)' },
    { value: 'vacation', label: 'Відпустка' }
];

const Attendance = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    
    // ✅ ЗАВЖДИ отримуємо свіжу дату при ініціалізації
    const initialDate = getCurrentUkraineDate();
    console.log('🚀 Ініціалізація компонента з датою:', initialDate);
    
    const [stateAttendance, setStateAttendance] = useState(() => {
        const savedState = loadAttendanceState();
        const currentDate = getCurrentUkraineDate();
        
        // ✅ Якщо є збережений стан І дата співпадає - використовуємо його
        if (savedState && savedState.savedDate === currentDate) {
            console.log('✅ Використовуємо збережений стан');
            return {
                isFilterOpen: savedState.isFilterOpen || false,
                selectData: savedState.selectData || { date: currentDate },
                confirmLoading: false,
                itemId: null,
                sendData: savedState.sendData || {
                    limit: 16,
                    page: 1,
                    sort_by: 'child_name',
                    sort_direction: 'asc',
                    date: currentDate
                }
            };
        }
        
        // ✅ Інакше створюємо новий стан з поточною датою
        console.log('🆕 Створюємо новий стан з поточною датою');
        return {
            isFilterOpen: false,
            selectData: { date: currentDate },
            confirmLoading: false,
            itemId: null,
            sendData: {
                limit: 16,
                page: 1,
                sort_by: 'child_name',
                sort_direction: 'asc',
                date: currentDate
            }
        };
    });

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/attendance/filter', {
        method: 'post',
        data: stateAttendance.sendData
    })
    
    const startRecord = ((stateAttendance.sendData.page || 1) - 1) * stateAttendance.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateAttendance.sendData.limit - 1, data?.totalItems || 1);

    // ✅ Виводимо дебаг інформацію
    useEffect(() => {
        console.log('📊 Поточний стан:', {
            selectData_date: stateAttendance.selectData.date,
            sendData_date: stateAttendance.sendData.date,
            currentDate: getCurrentUkraineDate()
        });
    }, [stateAttendance.selectData.date, stateAttendance.sendData.date]);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        console.log('🔄 Викликаємо API з датою:', stateAttendance.sendData.date);
        retryFetch('api/kindergarten/attendance/filter', {
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

    const toggleAttendance = async (record) => {
        const newStatus = record.attendance_status === 'present' ? 'absent' : 'present';
        const currentDate = stateAttendance.sendData.date 
            || stateAttendance.selectData.date 
            || getCurrentUkraineDate();
        
        try {
            if (record.attendance_id) {
                await fetchFunction(`api/kindergarten/attendance/${record.attendance_id}`, {
                    method: 'PUT',
                    data: {
                        attendance_status: newStatus
                    }
                });
            } else {
                await fetchFunction('api/kindergarten/attendance', {
                    method: 'POST',
                    data: {
                        date: currentDate,
                        child_id: record.child_id,
                        attendance_status: newStatus
                    }
                });
            }

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Відвідуваність оновлено успішно',
            });

            retryFetch('api/kindergarten/attendance/filter', {
                method: 'post',
                data: stateAttendance.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося оновити відвідуваність',
            });
        }
    };

    const columns = useMemo(() => {
        const columns = [
            {
                title: 'Дата',
                dataIndex: 'attendance_date',
                key: 'attendance_date',
                width: 120,
                render: (date) => {
                    const displayDate = stateAttendance.sendData.date 
                        || stateAttendance.selectData.date 
                        || getCurrentUkraineDate();
                    
                    try {
                        return new Date(displayDate).toLocaleDateString('uk-UA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                    } catch (error) {
                        return new Date(getCurrentUkraineDate()).toLocaleDateString('uk-UA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        });
                    }
                }
            },
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
            {
                title: 'Дія',
                key: 'actions',
                render: (_, record) => (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Button
                            title={record.attendance_status === 'present' ? 'Відмітити відсутність' : 'Відмітити присутність'}
                            icon={checkIcon}
                            size="small"
                            className={record.attendance_status === 'present' ? 'btn--secondary' : 'btn--primary'}
                            onClick={() => toggleAttendance(record)}
                        >
                            {record.attendance_status === 'present' ? 'Відмітити відсутність' : 'Відмітити присутність'}
                        </Button>
                    </div>
                ),
            }
        ];
        return columns;
    }, [stateAttendance.sendData.sort_by, stateAttendance.sendData.sort_direction, stateAttendance.sendData.date, stateAttendance.selectData.date]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            const currentDate = stateAttendance.sendData.date 
                || stateAttendance.selectData.date 
                || getCurrentUkraineDate();
            
            return data.items.map((el) => ({
                key: `${el.child_id}`,
                child_id: el.child_id,
                child_name: el.child_name,
                group_name: el.group_name,
                kindergarten_name: el.kindergarten_name,
                attendance_id: el.attendance_id,
                attendance_status: el.attendance_status || 'absent',
                attendance_date: currentDate
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

    const closeFilterDropdown = () => {
        setStateAttendance(prevState => ({
            ...prevState,
            isFilterOpen: false,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.keys(stateAttendance.selectData).some(key => {
            const value = stateAttendance.selectData[key];
            if (key === 'date') return false;
            return value !== null && value !== undefined && value !== '';
        });
    }, [stateAttendance.selectData]);

    const onHandleChange = (name, value) => {
        setStateAttendance(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [name]: value,
            },
        }))
    }

    const resetFilters = () => {
        const currentDate = getCurrentUkraineDate();
        console.log('🔄 Скидання фільтрів з поточною датою:', currentDate);
        
        if (Object.values(stateAttendance.selectData).some(Boolean)) {
            setStateAttendance((prev) => ({ 
                ...prev, 
                selectData: { date: currentDate }
            }));
        }
        if (!hasOnlyAllowedParams(stateAttendance.sendData, ['limit', 'page', 'sort_by', 'sort_direction', 'date'])) {
            setStateAttendance((prev) => ({
                ...prev,
                sendData: { 
                    limit: prev.sendData.limit, 
                    page: 1,
                    sort_by: 'child_name',
                    sort_direction: 'asc',
                    date: currentDate
                },
                isFilterOpen: false
            }));
        }
    };

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateAttendance.selectData).some((v) =>
            Array.isArray(v) ? v.length : v,
        );
        if (!isAnyInputFilled) return;

        const validation = validateFilters(stateAttendance.selectData);
        if (!validation.error) {
            setStateAttendance((prev) => ({
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

    // ✅ Кнопка для примусового оновлення дати (для дебагу)
    const forceUpdateDate = () => {
        const currentDate = getCurrentUkraineDate();
        console.log('🔥 ПРИМУСОВЕ ОНОВЛЕННЯ ДАТИ на:', currentDate);
        clearAttendanceState();
        setStateAttendance(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                date: currentDate
            },
            sendData: {
                ...prevState.sendData,
                date: currentDate,
                page: 1
            }
        }));
    };

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
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                        <small style={{marginLeft: '10px', color: '#666', fontSize: '12px'}}>
                                            (Дата: {stateAttendance.sendData.date})
                                        </small>
                                    </>
                                ) : (
                                    <>Записів не знайдено</>
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
                                
                                {/* ✅ ДЕБАГ: Кнопка для примусового оновлення */}
                                <Button
                                    onClick={forceUpdateDate}
                                    className="btn--secondary"
                                    title="Оновити дату на сьогоднішню"
                                >
                                    🔄 Оновити дату
                                </Button>
                                
                                <Button
                                    className={classNames("table-filter-trigger", {
                                        "has-active-filters": hasActiveFilters
                                    })}
                                    onClick={filterHandleClick}
                                    icon={filterIcon}
                                >
                                    Фільтри {hasActiveFilters && `(${Object.keys(stateAttendance.selectData).filter(key => key !== 'date' && stateAttendance.selectData[key]).length})`}
                                </Button>

                                <FilterDropdown
                                    isOpen={stateAttendance.isFilterOpen}
                                    onClose={closeFilterDropdown}
                                    filterData={stateAttendance.selectData}
                                    onFilterChange={onHandleChange}
                                    onApplyFilter={applyFilter}
                                    onResetFilters={resetFilters}
                                    searchIcon={searchIcon}
                                    title="Фільтри відвідуваності"
                                >
                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">ПІБ дитини</label>
                                        <Input
                                            icon={searchIcon}
                                            placeholder="Введіть ПІБ"
                                            value={stateAttendance.selectData.child_name || ''}
                                            onChange={(e) => onHandleChange('child_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Назва групи</label>
                                        <Input
                                            placeholder="Введіть назву групи"
                                            value={stateAttendance.selectData.group_name || ''}
                                            onChange={(e) => onHandleChange('group_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Назва садочка</label>
                                        <Input
                                            placeholder="Введіть назву садочка"
                                            value={stateAttendance.selectData.kindergarten_name || ''}
                                            onChange={(e) => onHandleChange('kindergarten_name', e.target.value)}
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Статус відвідуваності</label>
                                        <Select
                                            placeholder="Оберіть статус"
                                            value={
                                                stateAttendance.selectData.attendance_status 
                                                    ? ATTENDANCE_STATUS_OPTIONS.find(opt => opt.value === stateAttendance.selectData.attendance_status) 
                                                    : null
                                            }
                                            onChange={(value) => onHandleChange('attendance_status', value?.value || null)}
                                            options={ATTENDANCE_STATUS_OPTIONS}
                                            isClearable
                                        />
                                    </div>

                                    <div className="filter-dropdown__item">
                                        <label className="filter-dropdown__label">Дата</label>
                                        <Input
                                            type="date"
                                            value={stateAttendance.selectData.date || ''}
                                            onChange={(e) => {
                                                const newDate = e.target.value;
                                                console.log('📅 Зміна дати на:', newDate);
                                                onHandleChange('date', newDate);
                                                setStateAttendance(prevState => ({
                                                    ...prevState,
                                                    selectData: {
                                                        ...prevState.selectData,
                                                        date: newDate
                                                    },
                                                    sendData: {
                                                        ...prevState.sendData,
                                                        date: newDate,
                                                        page: 1
                                                    }
                                                }));
                                            }}
                                        />
                                    </div>
                                </FilterDropdown>
                            </div>
                        </div>

                        <div className="table-main">
                            <div className="table-and-pagination-wrapper">
                                <div className="table-wrapper" style={{
                                    overflowX: 'auto',
                                    minWidth: data?.items?.length > 0 ? '1200px' : 'auto'
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
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Attendance;