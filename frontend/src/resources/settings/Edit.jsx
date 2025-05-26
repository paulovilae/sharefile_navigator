import { Edit, SimpleForm, TextInput } from 'react-admin';

const SettingsEdit = () => (
    <Edit>
        <SimpleForm>
            <TextInput source="key" />
            <TextInput source="value" />
            <TextInput source="category" />
            <TextInput source="description" />
        </SimpleForm>
    </Edit>
);

export default SettingsEdit; 