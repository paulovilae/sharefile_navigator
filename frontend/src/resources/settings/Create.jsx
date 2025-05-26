import { Create, SimpleForm, TextInput } from 'react-admin';

const SettingsCreate = () => (
    <Create>
        <SimpleForm>
            <TextInput source="key" />
            <TextInput source="value" />
            <TextInput source="category" />
            <TextInput source="description" />
        </SimpleForm>
    </Create>
);

export default SettingsCreate; 