import { List, Datagrid, TextField, EditButton, useTranslate } from 'react-admin';

const SettingsList = () => {
    const translate = useTranslate();
    
    return (
        <List title={translate('settings.general')}>
            <Datagrid>
                <TextField source="id" label="ID" />
                <TextField source="key" label={translate('table.key')} />
                <TextField source="value" label={translate('table.value')} />
                <TextField source="category" label={translate('table.category')} />
                <TextField source="description" label={translate('table.description')} />
                <EditButton label={translate('table.actions')} />
            </Datagrid>
        </List>
    );
};

export default SettingsList;