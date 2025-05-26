import { List, Datagrid, TextField, EditButton } from 'react-admin';

const LocalizationList = () => (
    <List>
        <Datagrid>
            <TextField source="id" />
            <TextField source="language" />
            <TextField source="key" />
            <TextField source="value" />
            <EditButton />
        </Datagrid>
    </List>
);

export default LocalizationList; 