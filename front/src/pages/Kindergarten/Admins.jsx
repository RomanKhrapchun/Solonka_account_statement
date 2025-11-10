import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom'
import classNames from 'classnames';
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import {generateIcon, iconMap, STATUS} from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import Pagination from "../../components/common/Pagination/Pagination";
import {fetchFunction, validateFilters} from "../../utils/function";
import {useNotification} from "../../hooks/useNotification";
import {Context} from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import {Transition} from "react-transition-group";
import Input from "../../components/common/Input/Input";
import Select from "../../components/common/Select/Select";

// Іконки
const addIcon = generateIcon(iconMap.add, null, 'currentColor', 20, 20)
const editIcon = generateIcon(iconMap.edit, null, 'currentColor', 16, 16)
const deleteIcon = generateIcon(iconMap.delete, null, 'currentColor', 16, 16)
const filterIcon = generateIcon(iconMap.filter, null, 'currentColor', 20, 20)
const dropDownIcon = generateIcon(iconMap.arrowDown, null, 'currentColor', 20, 20)
const sortUpIcon = generateIcon(iconMap.arrowUp, 'sort-icon', 'currentColor', 14, 14)
const sortDownIcon = generateIcon(iconMap.arrowDown, 'sort-icon', 'currentColor', 14, 14)
const dropDownStyle = {width: '100%'}

// Опції ролей
const ROLE_OPTIONS = [
    { value: 'educator', label: 'Вихователь' }
];

const Admins = () => {
    const navigate = useNavigate()
    const notification = useNotification()
    const {store} = useContext(Context)
    const nodeRef = useRef(null)
    const modalNodeRef = useRef(null)
    
    const [stateAdmins, setStateAdmins] = useState({
        isFilterOpen: false,
        selectData: {},
        confirmLoading: false,
        itemId: null,
        sendData: {
            limit: 16,
            page: 1,
            sort_by: 'id',
            sort_direction: 'desc',
        }
    });

    // Стан модального вікна
    const [modalState, setModalState] = useState({
        isOpen: false,
        mode: 'create', // 'create' або 'edit'
        loading: false,
        formData: {
            id: null,
            phone_number: '',
            full_name: '',
            kindergarten_name: '',
            role: 'educator'
        }
    });

    const isFirstAPI = useRef(true);
    const {error, status, data, retryFetch} = useFetch('api/kindergarten/admins/filter', {
        method: 'post',
        data: stateAdmins.sendData
    })
    
    const startRecord = ((stateAdmins.sendData.page || 1) - 1) * stateAdmins.sendData.limit + 1;
    const endRecord = Math.min(startRecord + stateAdmins.sendData.limit - 1, data?.totalItems || 1);

    useEffect(() => {
        if (isFirstAPI.current) {
            isFirstAPI.current = false;
            return;
        }
        
        retryFetch('api/kindergarten/admins/filter', {
            method: 'post',
            data: stateAdmins.sendData
        });
    }, [stateAdmins.sendData, retryFetch]);

    const getSortIcon = useCallback((columnName) => {
        if (stateAdmins.sendData.sort_by === columnName) {
            return stateAdmins.sendData.sort_direction === 'asc' ? sortUpIcon : sortDownIcon;
        }
        return null;
    }, [stateAdmins.sendData.sort_by, stateAdmins.sendData.sort_direction]);

    const handleSort = useCallback((columnName) => {
        const currentSort = stateAdmins.sendData;
        let newDirection = 'asc';
        
        if (currentSort.sort_by === columnName) {
            newDirection = currentSort.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        setStateAdmins(prevState => ({
            ...prevState,
            sendData: {
                ...prevState.sendData,
                sort_by: columnName,
                sort_direction: newDirection,
                page: 1
            }
        }));
    }, [stateAdmins.sendData]);

    // Відкрити модальне вікно для створення
    const openCreateModal = () => {
        setModalState({
            isOpen: true,
            mode: 'create',
            loading: false,
            formData: {
                id: null,
                phone_number: '',
                full_name: '',
                kindergarten_name: '',
                role: 'educator'
            }
        });
    };

    // Відкрити модальне вікно для редагування
    const openEditModal = (record) => {
        setModalState({
            isOpen: true,
            mode: 'edit',
            loading: false,
            formData: {
                id: record.id,
                phone_number: record.phone_number,
                full_name: record.full_name,
                kindergarten_name: record.kindergarten_name,
                role: record.role
            }
        });
    };

    // Закрити модальне вікно
    const closeModal = () => {
        setModalState({
            isOpen: false,
            mode: 'create',
            loading: false,
            formData: {
                id: null,
                phone_number: '',
                full_name: '',
                kindergarten_name: '',
                role: 'educator'
            }
        });
    };

    // Зміна input поля
    const handleInputChange = (field, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [field]: value && typeof value === 'object' && value.value 
                    ? value.value 
                    : value
            }
        }));
    };

    // Зміна select поля
    const handleSelectChange = (name, value) => {
        setModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    };

    // Збереження (створення або оновлення)
    const handleSave = async () => {
        const { phone_number, full_name, kindergarten_name, role } = modalState.formData;

        // Валідація
        if (!phone_number.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, введіть номер телефону',
            });
            return;
        }

        if (!full_name.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, введіть ПІБ',
            });
            return;
        }

        if (!kindergarten_name.trim()) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Будь ласка, введіть назву садочка',
            });
            return;
        }

        try {
            setModalState(prev => ({ ...prev, loading: true }));

            if (modalState.mode === 'create') {
                await fetchFunction('api/kindergarten/admins', {
                    method: 'POST',
                    data: {
                        phone_number: phone_number.trim(),
                        full_name: full_name.trim(),
                        kindergarten_name: kindergarten_name.trim(),
                        role: role
                    }
                });

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: 'Адміністратора успішно створено',
                });
            } else {
                await fetchFunction(`api/kindergarten/admins/${modalState.formData.id}`, {
                    method: 'PUT',
                    data: {
                        phone_number: phone_number.trim(),
                        full_name: full_name.trim(),
                        kindergarten_name: kindergarten_name.trim(),
                        role: role
                    }
                });

                notification({
                    type: 'success',
                    placement: 'top',
                    title: 'Успіх',
                    message: 'Дані адміністратора успішно оновлено',
                });
            }

            closeModal();
            
            retryFetch('api/kindergarten/admins/filter', {
                method: 'post',
                data: stateAdmins.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося зберегти дані',
            });
        } finally {
            setModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Видалення
    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цього адміністратора?')) {
            return;
        }

        try {
            await fetchFunction(`api/kindergarten/admins/${id}`, {
                method: 'DELETE'
            });

            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Адміністратора успішно видалено',
            });

            retryFetch('api/kindergarten/admins/filter', {
                method: 'post',
                data: stateAdmins.sendData,
            });

        } catch (error) {
            notification({
                type: 'error',
                placement: 'top',
                title: 'Помилка',
                message: error.message || 'Не вдалося видалити адміністратора',
            });
        }
    };

    const columns = useMemo(() => {
        const columns = [
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'phone_number' ? 'active' : ''}`}
                        onClick={() => handleSort('phone_number')}
                    >
                        <span>Телефон</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('phone_number')}
                        </div>
                    </div>
                ),
                dataIndex: 'phone_number',
                key: 'phone_number',
                sorter: false,
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'full_name' ? 'active' : ''}`}
                        onClick={() => handleSort('full_name')}
                    >
                        <span>ПІБ вихователя</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('full_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'full_name',
                key: 'full_name',
                sorter: false,
            },
            {
                title: (
                    <div 
                        className={`sortable-header ${stateAdmins.sendData.sort_by === 'kindergarten_name' ? 'active' : ''}`}
                        onClick={() => handleSort('kindergarten_name')}
                    >
                        <span>Назва садочка</span>
                        <div className="sort-icon-wrapper">
                            {getSortIcon('kindergarten_name')}
                        </div>
                    </div>
                ),
                dataIndex: 'kindergarten_name',
                key: 'kindergarten_name',
                sorter: false,
            },
            {
                title: 'Роль',
                dataIndex: 'role',
                key: 'role',
                render: (role) => {
                    const roleLabel = role === 'educator' ? 'Вихователь' : 'Адміністратор';
                    return <span>{roleLabel}</span>;
                }
            },
            {
                title: 'Дії',
                key: 'actions',
                render: (_, record) => (
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Button
                            title="Редагувати"
                            icon={editIcon}
                            size="small"
                            className="btn--primary"
                            onClick={() => openEditModal(record)}
                        >
                            Редагувати
                        </Button>
                        <Button
                            title="Видалити"
                            icon={deleteIcon}
                            size="small"
                            className="btn--danger"
                            onClick={() => handleDelete(record.id)}
                        >
                            Видалити
                        </Button>
                    </div>
                ),
            }
        ];
        return columns;
    }, [stateAdmins.sendData.sort_by, stateAdmins.sendData.sort_direction]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map((el) => ({
                key: el.id,
                id: el.id,
                phone_number: el.phone_number,
                full_name: el.full_name,
                kindergarten_name: el.kindergarten_name,
                role: el.role,
            }));
        }
        return [];
    }, [data])

    const itemMenu = [
        {
            label: '16',
            key: '16',
            onClick: () => {
                if (stateAdmins.sendData.limit !== 16) {
                    setStateAdmins(prevState => ({
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
                if (stateAdmins.sendData.limit !== 32) {
                    setStateAdmins(prevState => ({
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
                if (stateAdmins.sendData.limit !== 48) {
                    setStateAdmins(prevState => ({
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
    ];

    const filterHandleClick = () => {
        setStateAdmins(prevState => ({
            ...prevState,
            isFilterOpen: !prevState.isFilterOpen,
        }))
    }

    const hasActiveFilters = useMemo(() => {
        return Object.values(stateAdmins.selectData).some(value => {
            if (Array.isArray(value)) return value.length > 0;
            return value !== '' && value !== null && value !== undefined;
        });
    }, [stateAdmins.selectData]);

    const onHandleChange = useCallback((field, value) => {
        setStateAdmins(prevState => ({
            ...prevState,
            selectData: {
                ...prevState.selectData,
                [field]: value,
            }
        }))
    }, [])

    const resetFilter = () => {
        setStateAdmins(prevState => ({
            ...prevState,
            selectData: {},
            sendData: {
                limit: prevState.sendData.limit,
                page: 1,
                sort_by: 'id',
                sort_direction: 'desc',
            }
        }))
    }

    const applyFilter = () => {
        const isAnyInputFilled = Object.values(stateAdmins.selectData).some(value => {
            if (Array.isArray(value) && !value.length) {
                return false
            }
            return value
        })
        if (isAnyInputFilled) {
            const dataValidation = validateFilters(stateAdmins.selectData)
            if (!dataValidation.error) {
                setStateAdmins(prevState => ({
                    ...prevState,
                    sendData: {
                        ...dataValidation,
                        limit: prevState.sendData.limit,
                        page: 1,
                        sort_by: prevState.sendData.sort_by,
                        sort_direction: prevState.sendData.sort_direction,
                    }
                }))
            } else {
                notification({
                    type: 'warning',
                    placement: 'top',
                    title: 'Помилка',
                    message: dataValidation.message ?? 'Щось пішло не так.',
                })
            }
        }
    }

    const onPageChange = useCallback((page) => {
        if (stateAdmins.sendData.page !== page) {
            setStateAdmins(prevState => ({
                ...prevState,
                sendData: {
                    ...prevState.sendData,
                    page,
                }
            }))
        }
    }, [stateAdmins.sendData.page])

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
                            <h2 className="title title--sm">
                                {data?.items?.length ? (
                                    <>
                                        Показує {startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з {data?.totalItems || 1}
                                    </>
                                ) : (
                                    <>Записів не знайдено</>
                                )}
                            </h2>

                            <div className="table-header__buttons">
                                <Button
                                    onClick={openCreateModal}
                                    icon={addIcon}
                                    className="btn--primary"
                                >
                                    Додати адміністратора
                                </Button>
                                
                                <Dropdown
                                    icon={dropDownIcon}
                                    iconPosition="right"
                                    style={dropDownStyle}
                                    caption={`Записів: ${stateAdmins.sendData.limit}`}
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
                                    "table-and-pagination-wrapper--active": stateAdmins.isFilterOpen
                                })}
                            >
                                <Table columns={columns} dataSource={tableData} />
                                <Pagination
                                    className="m-b"
                                    currentPage={Number(data?.currentPage) || 1}
                                    totalCount={data?.totalItems || 1}
                                    pageSize={stateAdmins.sendData.limit}
                                    onPageChange={onPageChange}
                                />
                            </div>

                            <Transition in={stateAdmins.isFilterOpen} timeout={300} nodeRef={nodeRef}>
                                {state => (
                                    <div 
                                        ref={nodeRef}
                                        className={classNames("table-filter", {
                                            "table-filter--active": stateAdmins.isFilterOpen
                                        })}
                                        style={{
                                            display: state === 'exited' ? 'none' : 'block'
                                        }}
                                    >
                                        <h3 className="title title--sm">
                                            Фільтри адміністраторів
                                        </h3>
                                        <div className="btn-group">
                                            <Button onClick={applyFilter}>
                                                Застосувати
                                            </Button>
                                            <Button className="btn--secondary" onClick={resetFilter}>
                                                Скинути
                                            </Button>
                                        </div>
                                        
                                        <div className="table-filter__item">
                                            <h4 className="input-description">Телефон</h4>
                                            <Input
                                                placeholder="Введіть телефон"
                                                value={stateAdmins.selectData.phone_number || ''}
                                                onChange={(e) => onHandleChange('phone_number', e.target.value)}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <h4 className="input-description">ПІБ</h4>
                                            <Input
                                                placeholder="Введіть ПІБ"
                                                value={stateAdmins.selectData.full_name || ''}
                                                onChange={(e) => onHandleChange('full_name', e.target.value)}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <h4 className="input-description">Назва садочка</h4>
                                            <Input
                                                placeholder="Введіть назву садочка"
                                                value={stateAdmins.selectData.kindergarten_name || ''}
                                                onChange={(e) => onHandleChange('kindergarten_name', e.target.value)}
                                            />
                                        </div>

                                        <div className="table-filter__item">
                                            <h4 className="input-description">Роль</h4>
                                            <Select
                                                placeholder="Оберіть роль"
                                                value={
                                                    stateAdmins.selectData.role 
                                                        ? ROLE_OPTIONS.find(opt => opt.value === stateAdmins.selectData.role) 
                                                        : null
                                                }
                                                onChange={(value) => onHandleChange('role', value?.value || null)}
                                                options={ROLE_OPTIONS}
                                                isClearable
                                            />
                                        </div>
                                    </div>
                                )}
                            </Transition>
                        </div>
                    </div>

                    {/* Модальне вікно */}
                    <Transition in={modalState.isOpen} timeout={200} unmountOnExit nodeRef={modalNodeRef}>
                        {state => (
                            <Modal
                                ref={modalNodeRef}
                                className={`modal-window-wrapper ${state === 'entered' ? 'modal-window-wrapper--active' : ''}`}
                                onClose={closeModal}
                                onOk={handleSave}
                                confirmLoading={modalState.loading}
                                cancelText="Скасувати"
                                okText={modalState.mode === 'create' ? 'Створити' : 'Зберегти'}
                                title={modalState.mode === 'create' ? 'Додати адміністратора' : 'Редагувати адміністратора'}
                            >
                                <div className="modal-input-wrapper">
                                    <div className="modal-input-item">
                                        <h4 className="input-description">Телефон</h4>
                                        <Input
                                            placeholder="Введіть телефон"
                                            name="phone_number"
                                            value={modalState.formData.phone_number}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="modal-input-item">
                                        <h4 className="input-description">ПІБ вихователя</h4>
                                        <Input
                                            placeholder="Введіть ПІБ"
                                            name="full_name"
                                            value={modalState.formData.full_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="modal-input-item">
                                        <h4 className="input-description">Назва садочка</h4>
                                        <Input
                                            placeholder="Введіть назву садочка"
                                            name="kindergarten_name"
                                            value={modalState.formData.kindergarten_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="modal-input-item">
                                        <h4 className="input-description">Роль</h4>
                                        <Select
                                            placeholder="Оберіть роль"
                                            options={ROLE_OPTIONS}
                                            value={ROLE_OPTIONS.find(opt => opt.value === modalState.formData.role) || null}
                                            onChange={(selectedOption) => handleSelectChange('role', selectedOption?.value || 'educator')}
                                            style={dropDownStyle}
                                            required
                                        />
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </Transition>
                </>
            )}
        </>
    );
};

export default Admins;