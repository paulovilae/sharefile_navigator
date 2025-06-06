import { List, Datagrid, TextField, EditButton, useTranslate } from 'react-admin';

const LocalizationList = () => {
    const translate = useTranslate();
    
    return (
        <List title={translate('localizations.management')}>
            <Datagrid>
                <TextField source="id" label="ID" />
                <TextField source="language" label={translate('table.language')} />
                <TextField source="key" label={translate('table.key')} />
                <TextField source="value" label={translate('table.value')} />
                <EditButton label={translate('table.actions')} />
            </Datagrid>
        </List>
    );
};

export default LocalizationList;