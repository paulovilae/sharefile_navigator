import { List, Datagrid, TextField, EditButton } from 'react-admin';

const SettingsList = () => (
    <List>
        <Datagrid>
            <TextField source="id" />
            <TextField source="key" />
            <TextField source="value" />
            <TextField source="category" />
            <TextField source="description" />
            <EditButton />
        </Datagrid>
    </List>
);

export default SettingsList; 