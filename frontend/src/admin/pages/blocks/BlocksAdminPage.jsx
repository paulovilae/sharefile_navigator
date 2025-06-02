import React, { useEffect, useState, useRef } from 'react';
import { Box, Tabs, Tab, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FolderIcon from '@mui/icons-material/Folder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import ArticleIcon from '@mui/icons-material/Article';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddIcon from '@mui/icons-material/Add';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import HelpIcon from '@mui/icons-material/Help';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import BuildIcon from '@mui/icons-material/Build';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArchiveIcon from '@mui/icons-material/Archive';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CollectionsIcon from '@mui/icons-material/Collections';
import MovieIcon from '@mui/icons-material/Movie';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import MicIcon from '@mui/icons-material/Mic';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import BrushIcon from '@mui/icons-material/Brush';
import CropIcon from '@mui/icons-material/Crop';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import TextFormatIcon from '@mui/icons-material/TextFormat';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SendIcon from '@mui/icons-material/Send';
import MailIcon from '@mui/icons-material/Mail';
import ChatIcon from '@mui/icons-material/Chat';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhoneIcon from '@mui/icons-material/Phone';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import BlockIcon from '@mui/icons-material/Block';
import ErrorIcon from '@mui/icons-material/Error';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import GroupIcon from '@mui/icons-material/Group';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import HomeIcon from '@mui/icons-material/Home';
import PublicIcon from '@mui/icons-material/Public';
import PlaceIcon from '@mui/icons-material/Place';
import MapIcon from '@mui/icons-material/Map';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import AlarmIcon from '@mui/icons-material/Alarm';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PaymentIcon from '@mui/icons-material/Payment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EuroIcon from '@mui/icons-material/Euro';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import Switch from '@mui/material/Switch';
import MonacoEditor from '@monaco-editor/react';
import { material } from '@uiw/codemirror-theme-material';
import CircularProgress from '@mui/material/CircularProgress';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import Chip from '@mui/material/Chip';

const iconMap = {
  Folder: <FolderIcon />,
  FolderOpen: <FolderOpenIcon />,
  InsertDriveFile: <InsertDriveFileIcon />,
  FileCopy: <FileCopyIcon />,
  Archive: <ArchiveIcon />,
  AttachFile: <AttachFileIcon />,
  Description: <DescriptionIcon />,
  LibraryBooks: <LibraryBooksIcon />,
  PictureAsPdf: <PictureAsPdfIcon />,
  Image: <ImageIcon />,
  TableChart: <TableChartIcon />,
  Collections: <CollectionsIcon />,
  Movie: <MovieIcon />,
  Audiotrack: <AudiotrackIcon />,
  Mic: <MicIcon />,
  CameraAlt: <CameraAltIcon />,
  Brush: <BrushIcon />,
  Crop: <CropIcon />,
  FormatPaint: <FormatPaintIcon />,
  TextFields: <TextFieldsIcon />,
  TextSnippet: <TextSnippetIcon />,
  Article: <ArticleIcon />,
  TextFormat: <TextFormatIcon />,
  FormatQuote: <FormatQuoteIcon />,
  FormatListBulleted: <FormatListBulletedIcon />,
  FormatAlignLeft: <FormatAlignLeftIcon />,
  FormatAlignCenter: <FormatAlignCenterIcon />,
  FormatAlignRight: <FormatAlignRightIcon />,
  FormatBold: <FormatBoldIcon />,
  FormatItalic: <FormatItalicIcon />,
  FormatUnderlined: <FormatUnderlinedIcon />,
  Undo: <UndoIcon />,
  Redo: <RedoIcon />,
  Add: <AddIcon />,
  Delete: <DeleteIcon />,
  Edit: <EditIcon />,
  Save: <SaveIcon />,
  UploadFile: <UploadFileIcon />,
  Download: <DownloadIcon />,
  CloudUpload: <CloudUploadIcon />,
  CloudDownload: <CloudDownloadIcon />,
  PlayArrow: <PlayArrowIcon />,
  Pause: <PauseIcon />,
  Stop: <StopIcon />,
  ArrowUpward: <ArrowUpwardIcon />,
  ArrowDownward: <ArrowDownwardIcon />,
  ChevronRight: <ChevronRightIcon />,
  Send: <SendIcon />,
  Print: <PrintIcon />,
  Share: <ShareIcon />,
  MoreHoriz: <MoreHorizIcon />,
  MoreVert: <MoreVertIcon />,
  CheckCircle: <CheckCircleIcon />,
  Cancel: <CancelIcon />,
  Warning: <WarningIcon />,
  Info: <InfoIcon />,
  Help: <HelpIcon />,
  Star: <StarIcon />,
  StarBorder: <StarBorderIcon />,
  StarHalf: <StarHalfIcon />,
  ThumbUp: <ThumbUpIcon />,
  ThumbDown: <ThumbDownIcon />,
  Block: <BlockIcon />,
  Error: <ErrorIcon />,
  DoneAll: <DoneAllIcon />,
  CheckBox: <CheckBoxIcon />,
  IndeterminateCheckBox: <IndeterminateCheckBoxIcon />,
  RadioButtonChecked: <RadioButtonCheckedIcon />,
  RadioButtonUnchecked: <RadioButtonUncheckedIcon />,
  People: <PeopleIcon />,
  Person: <PersonIcon />,
  GroupWork: <GroupWorkIcon />,
  Group: <GroupIcon />,
  SupervisorAccount: <SupervisorAccountIcon />,
  PersonAdd: <PersonAddIcon />,
  PersonRemove: <PersonRemoveIcon />,
  ViewModule: <ViewModuleIcon />,
  ViewList: <ViewListIcon />,
  Search: <SearchIcon />,
  FilterList: <FilterListIcon />,
  Visibility: <VisibilityIcon />,
  VisibilityOff: <VisibilityOffIcon />,
  Home: <HomeIcon />,
  Public: <PublicIcon />,
  Place: <PlaceIcon />,
  Map: <MapIcon />,
  Settings: <SettingsIcon />,
  SettingsApplications: <SettingsApplicationsIcon />,
  Build: <BuildIcon />,
  Lock: <LockIcon />,
  LockOpen: <LockOpenIcon />,
  Brightness4: <Brightness4Icon />,
  Brightness7: <Brightness7Icon />,
  Mail: <MailIcon />,
  Chat: <ChatIcon />,
  Notifications: <NotificationsIcon />,
  Phone: <PhoneIcon />,
  CalendarToday: <CalendarTodayIcon />,
  AccessTime: <AccessTimeIcon />,
  Event: <EventIcon />,
  Alarm: <AlarmIcon />,
  ShoppingCart: <ShoppingCartIcon />,
  Payment: <PaymentIcon />,
  CreditCard: <CreditCardIcon />,
  AttachMoney: <AttachMoneyIcon />,
  Euro: <EuroIcon />,
  TrendingUp: <TrendingUpIcon />,
  TrendingDown: <TrendingDownIcon />,
  BarChart: <BarChartIcon />,
  PieChart: <PieChartIcon />,
  DonutLarge: <DonutLargeIcon />,
  Assessment: <AssessmentIcon />,
  DirectionsRun: <DirectionsRunIcon />,
  DirectionsWalk: <DirectionsWalkIcon />,
  DirectionsCar: <DirectionsCarIcon />,
  DirectionsBike: <DirectionsBikeIcon />,
  DirectionsBus: <DirectionsBusIcon />,
  DirectionsBoat: <DirectionsBoatIcon />,
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`blocks-tabpanel-${index}`}
      aria-labelledby={`blocks-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>{children}</Box>
      )}
    </div>
  );
}

const iconCategories = [
  {
    label: 'Files & Folders',
    icons: [
      { name: 'Folder', icon: <FolderIcon /> },
      { name: 'FolderOpen', icon: <FolderOpenIcon /> },
      { name: 'InsertDriveFile', icon: <InsertDriveFileIcon /> },
      { name: 'FileCopy', icon: <FileCopyIcon /> },
      { name: 'Archive', icon: <ArchiveIcon /> },
      { name: 'AttachFile', icon: <AttachFileIcon /> },
      { name: 'Description', icon: <DescriptionIcon /> },
      { name: 'LibraryBooks', icon: <LibraryBooksIcon /> },
      { name: 'PictureAsPdf', icon: <PictureAsPdfIcon /> },
      { name: 'Image', icon: <ImageIcon /> },
      { name: 'TableChart', icon: <TableChartIcon /> },
      { name: 'Collections', icon: <CollectionsIcon /> },
    ],
  },
  {
    label: 'Media',
    icons: [
      { name: 'Movie', icon: <MovieIcon /> },
      { name: 'Audiotrack', icon: <AudiotrackIcon /> },
      { name: 'Mic', icon: <MicIcon /> },
      { name: 'CameraAlt', icon: <CameraAltIcon /> },
      { name: 'Brush', icon: <BrushIcon /> },
      { name: 'Crop', icon: <CropIcon /> },
      { name: 'FormatPaint', icon: <FormatPaintIcon /> },
      { name: 'Image', icon: <ImageIcon /> },
      { name: 'Collections', icon: <CollectionsIcon /> },
    ],
  },
  {
    label: 'Text',
    icons: [
      { name: 'TextFields', icon: <TextFieldsIcon /> },
      { name: 'TextSnippet', icon: <TextSnippetIcon /> },
      { name: 'Article', icon: <ArticleIcon /> },
      { name: 'TextFormat', icon: <TextFormatIcon /> },
      { name: 'FormatQuote', icon: <FormatQuoteIcon /> },
      { name: 'FormatListBulleted', icon: <FormatListBulletedIcon /> },
      { name: 'FormatAlignLeft', icon: <FormatAlignLeftIcon /> },
      { name: 'FormatAlignCenter', icon: <FormatAlignCenterIcon /> },
      { name: 'FormatAlignRight', icon: <FormatAlignRightIcon /> },
      { name: 'FormatBold', icon: <FormatBoldIcon /> },
      { name: 'FormatItalic', icon: <FormatItalicIcon /> },
      { name: 'FormatUnderlined', icon: <FormatUnderlinedIcon /> },
      { name: 'Undo', icon: <UndoIcon /> },
      { name: 'Redo', icon: <RedoIcon /> },
    ],
  },
  {
    label: 'Actions',
    icons: [
      { name: 'Add', icon: <AddIcon /> },
      { name: 'Delete', icon: <DeleteIcon /> },
      { name: 'Edit', icon: <EditIcon /> },
      { name: 'Save', icon: <SaveIcon /> },
      { name: 'UploadFile', icon: <UploadFileIcon /> },
      { name: 'Download', icon: <DownloadIcon /> },
      { name: 'CloudUpload', icon: <CloudUploadIcon /> },
      { name: 'CloudDownload', icon: <CloudDownloadIcon /> },
      { name: 'PlayArrow', icon: <PlayArrowIcon /> },
      { name: 'Pause', icon: <PauseIcon /> },
      { name: 'Stop', icon: <StopIcon /> },
      { name: 'ArrowUpward', icon: <ArrowUpwardIcon /> },
      { name: 'ArrowDownward', icon: <ArrowDownwardIcon /> },
      { name: 'ChevronRight', icon: <ChevronRightIcon /> },
      { name: 'Send', icon: <SendIcon /> },
      { name: 'Print', icon: <PrintIcon /> },
      { name: 'Share', icon: <ShareIcon /> },
      { name: 'MoreHoriz', icon: <MoreHorizIcon /> },
      { name: 'MoreVert', icon: <MoreVertIcon /> },
    ],
  },
  {
    label: 'Status',
    icons: [
      { name: 'CheckCircle', icon: <CheckCircleIcon /> },
      { name: 'Cancel', icon: <CancelIcon /> },
      { name: 'Warning', icon: <WarningIcon /> },
      { name: 'Info', icon: <InfoIcon /> },
      { name: 'Help', icon: <HelpIcon /> },
      { name: 'Star', icon: <StarIcon /> },
      { name: 'StarBorder', icon: <StarBorderIcon /> },
      { name: 'StarHalf', icon: <StarHalfIcon /> },
      { name: 'ThumbUp', icon: <ThumbUpIcon /> },
      { name: 'ThumbDown', icon: <ThumbDownIcon /> },
      { name: 'Block', icon: <BlockIcon /> },
      { name: 'Error', icon: <ErrorIcon /> },
      { name: 'DoneAll', icon: <DoneAllIcon /> },
      { name: 'CheckBox', icon: <CheckBoxIcon /> },
      { name: 'IndeterminateCheckBox', icon: <IndeterminateCheckBoxIcon /> },
      { name: 'RadioButtonChecked', icon: <RadioButtonCheckedIcon /> },
      { name: 'RadioButtonUnchecked', icon: <RadioButtonUncheckedIcon /> },
    ],
  },
  {
    label: 'People',
    icons: [
      { name: 'People', icon: <PeopleIcon /> },
      { name: 'Person', icon: <PersonIcon /> },
      { name: 'GroupWork', icon: <GroupWorkIcon /> },
      { name: 'Group', icon: <GroupIcon /> },
      { name: 'SupervisorAccount', icon: <SupervisorAccountIcon /> },
      { name: 'PersonAdd', icon: <PersonAddIcon /> },
      { name: 'PersonRemove', icon: <PersonRemoveIcon /> },
    ],
  },
  {
    label: 'Navigation',
    icons: [
      { name: 'ViewModule', icon: <ViewModuleIcon /> },
      { name: 'ViewList', icon: <ViewListIcon /> },
      { name: 'Search', icon: <SearchIcon /> },
      { name: 'FilterList', icon: <FilterListIcon /> },
      { name: 'Visibility', icon: <VisibilityIcon /> },
      { name: 'VisibilityOff', icon: <VisibilityOffIcon /> },
      { name: 'Home', icon: <HomeIcon /> },
      { name: 'Public', icon: <PublicIcon /> },
      { name: 'Place', icon: <PlaceIcon /> },
      { name: 'Map', icon: <MapIcon /> },
    ],
  },
  {
    label: 'Settings',
    icons: [
      { name: 'Settings', icon: <SettingsIcon /> },
      { name: 'SettingsApplications', icon: <SettingsApplicationsIcon /> },
      { name: 'Build', icon: <BuildIcon /> },
      { name: 'Lock', icon: <LockIcon /> },
      { name: 'LockOpen', icon: <LockOpenIcon /> },
      { name: 'Brightness4', icon: <Brightness4Icon /> },
      { name: 'Brightness7', icon: <Brightness7Icon /> },
    ],
  },
  {
    label: 'Communication',
    icons: [
      { name: 'Mail', icon: <MailIcon /> },
      { name: 'Chat', icon: <ChatIcon /> },
      { name: 'Notifications', icon: <NotificationsIcon /> },
      { name: 'Phone', icon: <PhoneIcon /> },
    ],
  },
  {
    label: 'Date & Time',
    icons: [
      { name: 'CalendarToday', icon: <CalendarTodayIcon /> },
      { name: 'AccessTime', icon: <AccessTimeIcon /> },
      { name: 'Event', icon: <EventIcon /> },
      { name: 'Alarm', icon: <AlarmIcon /> },
    ],
  },
  {
    label: 'Finance',
    icons: [
      { name: 'ShoppingCart', icon: <ShoppingCartIcon /> },
      { name: 'Payment', icon: <PaymentIcon /> },
      { name: 'CreditCard', icon: <CreditCardIcon /> },
      { name: 'AttachMoney', icon: <AttachMoneyIcon /> },
      { name: 'Euro', icon: <EuroIcon /> },
      { name: 'TrendingUp', icon: <TrendingUpIcon /> },
      { name: 'TrendingDown', icon: <TrendingDownIcon /> },
      { name: 'BarChart', icon: <BarChartIcon /> },
      { name: 'PieChart', icon: <PieChartIcon /> },
      { name: 'DonutLarge', icon: <DonutLargeIcon /> },
      { name: 'Assessment', icon: <AssessmentIcon /> },
    ],
  },
  {
    label: 'Transport',
    icons: [
      { name: 'DirectionsRun', icon: <DirectionsRunIcon /> },
      { name: 'DirectionsWalk', icon: <DirectionsWalkIcon /> },
      { name: 'DirectionsCar', icon: <DirectionsCarIcon /> },
      { name: 'DirectionsBike', icon: <DirectionsBikeIcon /> },
      { name: 'DirectionsBus', icon: <DirectionsBusIcon /> },
      { name: 'DirectionsBoat', icon: <DirectionsBoatIcon /> },
    ],
  },
];

function IconPicker({ value, onChange }) {
  const iconCategories = [
    {
      label: 'Files & Folders',
      icons: [
        { name: 'Folder', icon: <FolderIcon /> },
        { name: 'FolderOpen', icon: <FolderOpenIcon /> },
        { name: 'InsertDriveFile', icon: <InsertDriveFileIcon /> },
        { name: 'FileCopy', icon: <FileCopyIcon /> },
        { name: 'Archive', icon: <ArchiveIcon /> },
        { name: 'AttachFile', icon: <AttachFileIcon /> },
        { name: 'Description', icon: <DescriptionIcon /> },
        { name: 'LibraryBooks', icon: <LibraryBooksIcon /> },
        { name: 'PictureAsPdf', icon: <PictureAsPdfIcon /> },
        { name: 'Image', icon: <ImageIcon /> },
        { name: 'TableChart', icon: <TableChartIcon /> },
        { name: 'Collections', icon: <CollectionsIcon /> },
      ],
    },
    {
      label: 'Media',
      icons: [
        { name: 'Movie', icon: <MovieIcon /> },
        { name: 'Audiotrack', icon: <AudiotrackIcon /> },
        { name: 'Mic', icon: <MicIcon /> },
        { name: 'CameraAlt', icon: <CameraAltIcon /> },
        { name: 'Brush', icon: <BrushIcon /> },
        { name: 'Crop', icon: <CropIcon /> },
        { name: 'FormatPaint', icon: <FormatPaintIcon /> },
        { name: 'Image', icon: <ImageIcon /> },
        { name: 'Collections', icon: <CollectionsIcon /> },
      ],
    },
    {
      label: 'Text',
      icons: [
        { name: 'TextFields', icon: <TextFieldsIcon /> },
        { name: 'TextSnippet', icon: <TextSnippetIcon /> },
        { name: 'Article', icon: <ArticleIcon /> },
        { name: 'TextFormat', icon: <TextFormatIcon /> },
        { name: 'FormatQuote', icon: <FormatQuoteIcon /> },
        { name: 'FormatListBulleted', icon: <FormatListBulletedIcon /> },
        { name: 'FormatAlignLeft', icon: <FormatAlignLeftIcon /> },
        { name: 'FormatAlignCenter', icon: <FormatAlignCenterIcon /> },
        { name: 'FormatAlignRight', icon: <FormatAlignRightIcon /> },
        { name: 'FormatBold', icon: <FormatBoldIcon /> },
        { name: 'FormatItalic', icon: <FormatItalicIcon /> },
        { name: 'FormatUnderlined', icon: <FormatUnderlinedIcon /> },
        { name: 'Undo', icon: <UndoIcon /> },
        { name: 'Redo', icon: <RedoIcon /> },
      ],
    },
    {
      label: 'Actions',
      icons: [
        { name: 'Add', icon: <AddIcon /> },
        { name: 'Delete', icon: <DeleteIcon /> },
        { name: 'Edit', icon: <EditIcon /> },
        { name: 'Save', icon: <SaveIcon /> },
        { name: 'UploadFile', icon: <UploadFileIcon /> },
        { name: 'Download', icon: <DownloadIcon /> },
        { name: 'CloudUpload', icon: <CloudUploadIcon /> },
        { name: 'CloudDownload', icon: <CloudDownloadIcon /> },
        { name: 'PlayArrow', icon: <PlayArrowIcon /> },
        { name: 'Pause', icon: <PauseIcon /> },
        { name: 'Stop', icon: <StopIcon /> },
        { name: 'ArrowUpward', icon: <ArrowUpwardIcon /> },
        { name: 'ArrowDownward', icon: <ArrowDownwardIcon /> },
        { name: 'ChevronRight', icon: <ChevronRightIcon /> },
        { name: 'Send', icon: <SendIcon /> },
        { name: 'Print', icon: <PrintIcon /> },
        { name: 'Share', icon: <ShareIcon /> },
        { name: 'MoreHoriz', icon: <MoreHorizIcon /> },
        { name: 'MoreVert', icon: <MoreVertIcon /> },
      ],
    },
    {
      label: 'Status',
      icons: [
        { name: 'CheckCircle', icon: <CheckCircleIcon /> },
        { name: 'Cancel', icon: <CancelIcon /> },
        { name: 'Warning', icon: <WarningIcon /> },
        { name: 'Info', icon: <InfoIcon /> },
        { name: 'Help', icon: <HelpIcon /> },
        { name: 'Star', icon: <StarIcon /> },
        { name: 'StarBorder', icon: <StarBorderIcon /> },
        { name: 'StarHalf', icon: <StarHalfIcon /> },
        { name: 'ThumbUp', icon: <ThumbUpIcon /> },
        { name: 'ThumbDown', icon: <ThumbDownIcon /> },
        { name: 'Block', icon: <BlockIcon /> },
        { name: 'Error', icon: <ErrorIcon /> },
        { name: 'DoneAll', icon: <DoneAllIcon /> },
        { name: 'CheckBox', icon: <CheckBoxIcon /> },
        { name: 'IndeterminateCheckBox', icon: <IndeterminateCheckBoxIcon /> },
        { name: 'RadioButtonChecked', icon: <RadioButtonCheckedIcon /> },
        { name: 'RadioButtonUnchecked', icon: <RadioButtonUncheckedIcon /> },
      ],
    },
    {
      label: 'People',
      icons: [
        { name: 'People', icon: <PeopleIcon /> },
        { name: 'Person', icon: <PersonIcon /> },
        { name: 'GroupWork', icon: <GroupWorkIcon /> },
        { name: 'Group', icon: <GroupIcon /> },
        { name: 'SupervisorAccount', icon: <SupervisorAccountIcon /> },
        { name: 'PersonAdd', icon: <PersonAddIcon /> },
        { name: 'PersonRemove', icon: <PersonRemoveIcon /> },
      ],
    },
    {
      label: 'Navigation',
      icons: [
        { name: 'ViewModule', icon: <ViewModuleIcon /> },
        { name: 'ViewList', icon: <ViewListIcon /> },
        { name: 'Search', icon: <SearchIcon /> },
        { name: 'FilterList', icon: <FilterListIcon /> },
        { name: 'Visibility', icon: <VisibilityIcon /> },
        { name: 'VisibilityOff', icon: <VisibilityOffIcon /> },
        { name: 'Home', icon: <HomeIcon /> },
        { name: 'Public', icon: <PublicIcon /> },
        { name: 'Place', icon: <PlaceIcon /> },
        { name: 'Map', icon: <MapIcon /> },
      ],
    },
    {
      label: 'Settings',
      icons: [
        { name: 'Settings', icon: <SettingsIcon /> },
        { name: 'SettingsApplications', icon: <SettingsApplicationsIcon /> },
        { name: 'Build', icon: <BuildIcon /> },
        { name: 'Lock', icon: <LockIcon /> },
        { name: 'LockOpen', icon: <LockOpenIcon /> },
        { name: 'Brightness4', icon: <Brightness4Icon /> },
        { name: 'Brightness7', icon: <Brightness7Icon /> },
      ],
    },
    {
      label: 'Communication',
      icons: [
        { name: 'Mail', icon: <MailIcon /> },
        { name: 'Chat', icon: <ChatIcon /> },
        { name: 'Notifications', icon: <NotificationsIcon /> },
        { name: 'Phone', icon: <PhoneIcon /> },
      ],
    },
    {
      label: 'Date & Time',
      icons: [
        { name: 'CalendarToday', icon: <CalendarTodayIcon /> },
        { name: 'AccessTime', icon: <AccessTimeIcon /> },
        { name: 'Event', icon: <EventIcon /> },
        { name: 'Alarm', icon: <AlarmIcon /> },
      ],
    },
    {
      label: 'Finance',
      icons: [
        { name: 'ShoppingCart', icon: <ShoppingCartIcon /> },
        { name: 'Payment', icon: <PaymentIcon /> },
        { name: 'CreditCard', icon: <CreditCardIcon /> },
        { name: 'AttachMoney', icon: <AttachMoneyIcon /> },
        { name: 'Euro', icon: <EuroIcon /> },
        { name: 'TrendingUp', icon: <TrendingUpIcon /> },
        { name: 'TrendingDown', icon: <TrendingDownIcon /> },
        { name: 'BarChart', icon: <BarChartIcon /> },
        { name: 'PieChart', icon: <PieChartIcon /> },
        { name: 'DonutLarge', icon: <DonutLargeIcon /> },
        { name: 'Assessment', icon: <AssessmentIcon /> },
      ],
    },
    {
      label: 'Transport',
      icons: [
        { name: 'DirectionsRun', icon: <DirectionsRunIcon /> },
        { name: 'DirectionsWalk', icon: <DirectionsWalkIcon /> },
        { name: 'DirectionsCar', icon: <DirectionsCarIcon /> },
        { name: 'DirectionsBike', icon: <DirectionsBikeIcon /> },
        { name: 'DirectionsBus', icon: <DirectionsBusIcon /> },
        { name: 'DirectionsBoat', icon: <DirectionsBoatIcon /> },
      ],
    },
  ];
  return (
    <Box sx={{ maxHeight: 320, overflowY: 'auto', mb: 2 }}>
      {iconCategories.map(cat => (
        <Box key={cat.label} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 600 }}>{cat.label}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {cat.icons.map(({ name, icon }) => (
              <Tooltip title={name} key={name} placement="top">
                <Box
                  component="button"
                  type="button"
                  onClick={() => onChange({ target: { name: 'icon', value: name } })}
                  sx={{
                    border: value === name ? '2px solid #51247A' : '2px solid transparent',
                    borderRadius: 2,
                    background: value === name ? '#f3eaff' : 'transparent',
                    p: 1.2,
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: value === name ? 4 : 0,
                    transition: 'all 0.15s',
                    '&:hover': { background: '#f3eaff' },
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 0,
                    width: 44,
                    height: 44,
                  }}
                  aria-label={name}
                >
                  {React.cloneElement(icon, { sx: { fontSize: 28, color: value === name ? '#51247A' : '#888' } })}
                </Box>
              </Tooltip>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// Enhanced BulkCreateDialog
function BulkCreateDialog({ open, onClose, onBulkCreate, label, example, dialogTitle }) {
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0); // 0: Paste, 1: File, 2: URL
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const theme = useTheme();
  const dropRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files ? e.target.files[0] : e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setError('File must be a .json file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        JSON.parse(evt.target.result);
        setJson(evt.target.result);
        setError('');
      } catch (e) {
        setError('Invalid JSON in file');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFetchUrl = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch URL');
      const text = await res.text();
      JSON.parse(text);
      setJson(text);
      setError('');
    } catch (e) {
      setError('Could not fetch or parse JSON from URL');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={{
        sx: theme.palette ? {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRadius: 3,
          boxShadow: 8,
        } : {}
      }}
    >
      <DialogTitle sx={theme.palette ? { background: theme.palette.primary.main, color: theme.palette.primary.contrastText, fontWeight: 600, letterSpacing: 0.5 } : {}}>
        {dialogTitle || `Upload ${label} from JSON`}
      </DialogTitle>
      <DialogContent
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={dragOver ? { border: '2px dashed #51247A', background: '#f3eaff' } : {}}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Paste JSON" />
          <Tab label="Upload File" />
          <Tab label="From URL" />
        </Tabs>
        <Box sx={{ mb: 2, fontWeight: 500, color: '#51247A' }}>
          Drag and drop a .json file anywhere in this dialog to upload
        </Box>
        {tab === 0 && (
          <>
            <Box sx={{ mb: 2 }}>
              Paste a JSON array of {label.toLowerCase()} below. Example:
              <pre style={{ background: theme.palette ? theme.palette.mode === 'dark' ? '#23202b' : '#f6f6f6' : '#f6f6f6', padding: 8, borderRadius: 4, fontSize: 13 }}>{example}</pre>
            </Box>
            <TextField
              label="JSON Array"
              multiline
              minRows={6}
              fullWidth
              value={json}
              onChange={e => setJson(e.target.value)}
              error={!!error}
              helperText={error || ''}
            />
          </>
        )}
        {tab === 1 && (
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" component="label">
              Select JSON File
              <input type="file" accept="application/json" hidden onChange={handleFile} />
            </Button>
            {error && <Box sx={{ color: 'error.main', mt: 1 }}>{error}</Box>}
            <TextField
              label="File Contents"
              multiline
              minRows={6}
              fullWidth
              value={json}
              onChange={e => setJson(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ mb: 2 }}>
            <TextField
              label="JSON URL"
              fullWidth
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/data.json"
              sx={{ mb: 2 }}
            />
            <Button variant="outlined" onClick={handleFetchUrl} disabled={loading || !url} sx={{ mb: 2 }}>
              {loading ? 'Loading...' : 'Fetch JSON'}
            </Button>
            {error && <Box sx={{ color: 'error.main', mt: 1 }}>{error}</Box>}
            <TextField
              label="Fetched JSON"
              multiline
              minRows={6}
              fullWidth
              value={json}
              onChange={e => setJson(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={theme.palette ? { background: theme.palette.grey[theme.palette.mode === 'dark' ? 900 : 100] } : {}}>
        <Button onClick={onClose} color="secondary" variant="outlined">Cancel</Button>
        <Button onClick={() => {
          try {
            const arr = JSON.parse(json);
            if (!Array.isArray(arr)) throw new Error('Must be a JSON array');
            setError('');
            onBulkCreate(arr);
            setJson('');
            setError('');
            setUrl('');
            setTab(0);
          } catch (e) {
            setError(e.message);
          }
        }} variant="contained" color="primary">Upload</Button>
      </DialogActions>
    </Dialog>
  );
}

function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BlockCategoriesTable() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '' });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selected, setSelected] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const iconOptions = [
    { value: 'Folder', label: 'Folder', icon: <FolderIcon /> },
    { value: 'PictureAsPdf', label: 'PDF', icon: <PictureAsPdfIcon /> },
    { value: 'TextFields', label: 'OCR/Text', icon: <TextFieldsIcon /> },
    { value: 'Image', label: 'Image', icon: <ImageIcon /> },
    { value: 'Article', label: 'Text Analysis', icon: <ArticleIcon /> },
    { value: 'Settings', label: 'Workflow', icon: <SettingsIcon /> },
    { value: 'CloudUpload', label: 'Export/Integration', icon: <CloudUploadIcon /> },
  ];

  useEffect(() => {
    fetch('/api/blocks/block_categories')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array, fallback to empty array if not
        setCategories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
        setLoading(false);
      });
  }, []);

  const handleOpen = (cat) => {
    setEditCategory(cat);
    setForm(cat ? { name: cat.name, description: cat.description, icon: cat.icon || '' } : { name: '', description: '', icon: '' });
    setOpen(true);
  };
  const handleClose = () => { setOpen(false); setEditCategory(null); };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = () => {
    // Placeholder: implement POST/PUT
    handleClose();
  };
  const handleDelete = (cat) => {
    // Placeholder: implement DELETE
    alert('Delete ' + cat.name);
  };

  const handleBulkCreate = async (arr) => {
    setBulkOpen(false);
    let success = 0, fail = 0;
    for (const item of arr) {
      try {
        await fetch('/api/blocks/block_category', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        success++;
      } catch {
        fail++;
      }
    }
    setSnackbar({ open: true, message: `Created ${success} categories${fail ? ', failed ' + fail : ''}`, severity: fail ? 'warning' : 'success' });
    // Optionally reload categories
    fetch('/api/blocks/block_categories')
      .then(res => res.json())
      .then(data => {
        setCategories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to reload categories:', error);
        setCategories([]);
        setLoading(false);
      });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(categories.map(cat => cat.id));
    else setSelected([]);
  };
  const handleSelect = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleDeleteSelected = async () => {
    setConfirmDeleteOpen(false);
    let success = 0, fail = 0;
    for (const id of selected) {
      try {
        await fetch(`/api/blocks/block_category/${id}`, { method: 'DELETE' });
        success++;
      } catch {
        fail++;
      }
    }
    setSnackbar({ open: true, message: `Deleted ${success} categories${fail ? ', failed ' + fail : ''}`, severity: fail ? 'warning' : 'success' });
    setSelected([]);
    fetch('/api/blocks/block_categories')
      .then(res => res.json())
      .then(data => {
        setCategories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to reload categories after delete:', error);
        setCategories([]);
        setLoading(false);
      });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Tooltip title="Create a new category"><span><Button variant="contained" color="primary" onClick={() => handleOpen(null)}>Create Category</Button></span></Tooltip>
        <Tooltip title="Upload categories from a JSON file"><span><Button variant="contained" color="primary" onClick={() => setBulkOpen(true)}>Upload JSON</Button></span></Tooltip>
        <Tooltip title={selected.length ? `Download ${selected.length} selected categories as JSON` : 'Select categories to enable download'}>
          <span>
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              disabled={selected.length === 0}
              onClick={() => downloadJsonFile(categories.filter(cat => selected.includes(cat.id)), selected.length === categories.length ? 'block_categories.json' : 'block_categories_selected.json')}
            >
              Download JSON
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={selected.length ? `Delete ${selected.length} selected categories` : 'Select categories to enable delete'}>
          <span>
            <Button
              variant="contained"
              color="primary"
              disabled={selected.length === 0}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete Selected
            </Button>
          </span>
        </Tooltip>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < categories.length}
                  checked={categories.length > 0 && selected.length === categories.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all categories' }}
                />
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Icon</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(cat => (
              <TableRow key={cat.id} selected={selected.includes(cat.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.includes(cat.id)}
                    onChange={() => handleSelect(cat.id)}
                    inputProps={{ 'aria-label': `select category ${cat.name}` }}
                  />
                </TableCell>
                <TableCell>{cat.id}</TableCell>
                <TableCell>{iconMap[cat.icon] || null}</TableCell>
                <TableCell>{cat.name}</TableCell>
                <TableCell>{cat.description}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(cat)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(cat)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Delete Selected Categories?</DialogTitle>
        <DialogContent>Are you sure you want to delete {selected.length} selected categories? This cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSelected} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editCategory ? 'Edit' : 'Create'} Category</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            Categories help organize block templates. Use a clear, descriptive name.
          </Box>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label={<span>Name&nbsp;<Tooltip title="A short, descriptive name for this category (e.g., 'File Managers', 'OCR Tools')"><HelpOutlineIcon fontSize="small" color="action" /></Tooltip></span>}
            fullWidth
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. File Managers"
            helperText="Required. The display name for this category."
          />
          <TextField
            margin="dense"
            name="description"
            label={<span>Description&nbsp;<Tooltip title="Optional. Add a short description to help users understand what blocks belong here."><HelpOutlineIcon fontSize="small" color="action" /></Tooltip></span>}
            fullWidth
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. Blocks for browsing and managing files"
            helperText="Optional. A short description of this category."
          />
          <IconPicker value={form.icon} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <BulkCreateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onBulkCreate={handleBulkCreate}
        label="Categories"
        example={`[
  { "name": "File Managers", "description": "Blocks for browsing, uploading, and managing files and folders.", "icon": "Folder" },
  { "name": "PDF Tools", "description": "Blocks for converting, splitting, merging, and manipulating PDF documents.", "icon": "PictureAsPdf" }
]`}
        dialogTitle="Upload Categories from JSON"
      />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

function BlockEditorDialog({ open, onClose, template }) {
  const [tab, setTab] = useState(0);
  const [meta, setMeta] = useState({
    display_name: template?.display_name || '',
    description: template?.description || '',
    enabled: template?.enabled ?? true,
    type: template?.type || 'frontend',
  });
  const [params, setParams] = useState(() => {
    const cs = template?.config_schema || {};
    return Object.entries(cs).map(([name, def]) => ({ name, ...def }));
  });
  const [jsxCode, setJsxCode] = useState(template?.jsx_code || '');
  const [codeHistory, setCodeHistory] = useState([]);
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [paramDialog, setParamDialog] = useState({ open: false, editIdx: null, data: { name: '', type: 'text', default: '', label: '', options: '' } });
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState('codemirror');
  const [deploying, setDeploying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    setMeta({
      display_name: template?.display_name || '',
      description: template?.description || '',
      enabled: template?.enabled ?? true,
      type: template?.type || 'frontend',
    });
    const cs = template?.config_schema || {};
    setParams(Object.entries(cs).map(([name, def]) => ({ name, ...def })));
    setJsxCode(template?.jsx_code || '');
    setCodeHistory([]);
    setAiResponse('');
  }, [template]);

  const askLlamaEdit = async (prompt) => {
    setLoading(true);
    setAiResponse('');
    setCodeHistory(hist => [...hist, jsxCode]);
    const res = await fetch('/api/llama/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: jsxCode, prompt }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.code) {
      setJsxCode(data.code);
    }
    setAiResponse(data.explanation || '');
  };

  const handleUndo = () => {
    setCodeHistory(hist => {
      if (hist.length === 0) return hist;
      const prev = hist[hist.length - 1];
      setJsxCode(prev);
      return hist.slice(0, -1);
    });
  };

  // Preview: build config_schema from params
  const configSchema = params.reduce((acc, p) => {
    acc[p.name] = { ...p };
    delete acc[p.name].name;
    return acc;
  }, {});

  // Simple preview for PDFConverterBlock
  function PreviewBlock() {
    // Build default param values
    const [values, setValues] = useState(() => {
      const v = {};
      params.forEach(p => { v[p.name] = p.default; });
      return v;
    });
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>{meta.display_name || 'Block Preview'}</Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          {params.map(p => (
            <Box key={p.name}>
              <Typography variant="body2">{p.label || p.name}</Typography>
              {p.type === 'select' ? (
                <select value={values[p.name]} onChange={e => setValues(v => ({ ...v, [p.name]: e.target.value }))}>
                  {(p.options || '').split(',').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : p.type === 'checkbox' ? (
                <input type="checkbox" checked={!!values[p.name]} onChange={e => setValues(v => ({ ...v, [p.name]: e.target.checked }))} />
              ) : (
                <input type={p.type} value={values[p.name]} onChange={e => setValues(v => ({ ...v, [p.name]: e.target.value }))} style={{ width: 80 }} />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // Add/edit param handlers
  const handleParamSave = () => {
    setParams(ps => {
      const arr = [...ps];
      if (paramDialog.editIdx != null) arr[paramDialog.editIdx] = paramDialog.data;
      else arr.push(paramDialog.data);
      return arr;
    });
    setParamDialog({ open: false, editIdx: null, data: { name: '', type: 'text', default: '', label: '', options: '' } });
  };
  const handleParamEdit = (idx) => setParamDialog({ open: true, editIdx: idx, data: { ...params[idx] } });
  const handleParamDelete = (idx) => setParams(ps => ps.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    const updatedTemplate = {
      ...template,
      display_name: meta.display_name,
      description: meta.description,
      enabled: meta.enabled,
      type: meta.type,
      config_schema: params.reduce((acc, p) => {
        acc[p.name] = { ...p };
        delete acc[p.name].name;
        return acc;
      }, {}),
      jsx_code: jsxCode,
    };
    await fetch(`/api/blocks/block_template/${template.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTemplate),
    });
    // Also deploy to file
    const res = await fetch('/api/blocks/deploy_frontend_block_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block_id: template.id, code: jsxCode }),
    });
    const data = await res.json();
    let msg = `Frontend block code saved to database (template: ${meta.display_name})`;
    if (data.file_path) {
      msg += `\nSaved to: ${data.file_path}`;
    }
    setSnackbar({ open: true, message: msg, severity: data.success ? 'success' : 'error' });
    setSaving(false);
    onClose();
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      if (meta.type === 'frontend') {
        // Save code to template (PUT)
        const updatedTemplate = {
          ...template,
          display_name: meta.display_name,
          description: meta.description,
          enabled: meta.enabled,
          type: meta.type,
          config_schema: params.reduce((acc, p) => {
            acc[p.name] = { ...p };
            delete acc[p.name].name;
            return acc;
          }, {}),
          jsx_code: jsxCode,
        };
        await fetch(`/api/blocks/block_template/${template.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTemplate),
        });
        // Also deploy to file
        const res = await fetch('/api/blocks/deploy_frontend_block_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_id: template.id, code: jsxCode }),
        });
        const data = await res.json();
        let msg = `Frontend block code saved to database (template: ${meta.display_name})`;
        if (data.file_path) {
          msg += `\nSaved to: ${data.file_path}`;
        }
        setSnackbar({ open: true, message: msg, severity: data.success ? 'success' : 'error' });
      } else {
        // Backend deploy
        const res = await fetch('/api/blocks/deploy_block_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ block_id: template.id, code: jsxCode }),
        });
        const data = await res.json();
        let msg = data.message || 'Deployed!';
        if (data.file_path) {
          msg += `\nSaved to: ${data.file_path}`;
        }
        setSnackbar({ open: true, message: msg, severity: data.success ? 'success' : 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Deploy failed', severity: 'error' });
    }
    setDeploying(false);
  };

  // Editor selection dropdown
  const editorDropdown = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Typography variant="body2">Editor:</Typography>
      <Select size="small" value={editor} onChange={e => setEditor(e.target.value)} sx={{ minWidth: 160 }}>
        <MenuItem value="monaco">Monaco</MenuItem>
        <MenuItem value="codemirror">CodeMirror</MenuItem>
      </Select>
    </Box>
  );

  // Main action row
  const actionRow = (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
      <Button variant="contained" onClick={() => askLlamaEdit('Refactor this code for readability')} disabled={loading}>Refactor</Button>
      <Button variant="contained" onClick={() => askLlamaEdit('Add comments to this code')} disabled={loading}>Add Comments</Button>
      <Button variant="contained" onClick={handleUndo} disabled={codeHistory.length === 0}>Undo</Button>
      <TextField
        label="Custom Llama Prompt"
        value={customPrompt}
        onChange={e => setCustomPrompt(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') askLlamaEdit(customPrompt); }}
        sx={{ minWidth: 220 }}
        disabled={loading}
      />
      <Button variant="contained" onClick={() => askLlamaEdit(customPrompt)} disabled={loading || !customPrompt}>Run</Button>
      <Button variant="contained" color="secondary" onClick={handleDeploy} disabled={deploying}>Deploy</Button>
      <IconButton onClick={() => setFullscreen(f => !f)}>
        {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </IconButton>
      {loading && <CircularProgress size={24} />}
      {deploying && <CircularProgress size={20} />}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      PaperProps={fullscreen ? {
        sx: {
          m: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
        }
      } : {}}
    >
      <DialogTitle>Edit Block Template</DialogTitle>
      <DialogContent sx={fullscreen ? { p: 0, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' } : {}}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Metadata" />
          <Tab label="Parameters" />
          <Tab label="Preview" />
          <Tab label="Code" />
        </Tabs>
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Display Name" value={meta.display_name} onChange={e => setMeta(m => ({ ...m, display_name: e.target.value }))} fullWidth />
            <TextField label="Description" value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} fullWidth />
            <FormControlLabel control={<Switch checked={meta.enabled} onChange={e => setMeta(m => ({ ...m, enabled: e.target.checked }))} />} label="Enabled" />
            <TextField select label="Block Type" value={meta.type} onChange={e => setMeta(m => ({ ...m, type: e.target.value }))} fullWidth>
              <MenuItem value="frontend">Frontend (JSX/React)</MenuItem>
              <MenuItem value="backend">Backend (Python)</MenuItem>
            </TextField>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            <Button startIcon={<AddIcon />} variant="outlined" sx={{ mb: 2 }} onClick={() => setParamDialog({ open: true, editIdx: null, data: { name: '', type: 'text', default: '', label: '', options: '' } })}>Add Parameter</Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell><TableCell>Type</TableCell><TableCell>Default</TableCell><TableCell>Label</TableCell><TableCell>Options</TableCell><TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {params.map((p, idx) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{String(p.default)}</TableCell>
                    <TableCell>{p.label}</TableCell>
                    <TableCell>{p.options}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleParamEdit(idx)}>Edit</Button>
                      <Button size="small" color="error" onClick={() => handleParamDelete(idx)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Dialog open={paramDialog.open} onClose={() => setParamDialog({ ...paramDialog, open: false })}>
              <DialogTitle>{paramDialog.editIdx != null ? 'Edit' : 'Add'} Parameter</DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
                <TextField label="Name" value={paramDialog.data.name} onChange={e => setParamDialog(d => ({ ...d, data: { ...d.data, name: e.target.value } }))} />
                <TextField label="Label" value={paramDialog.data.label} onChange={e => setParamDialog(d => ({ ...d, data: { ...d.data, label: e.target.value } }))} />
                <TextField label="Type" select value={paramDialog.data.type} onChange={e => setParamDialog(d => ({ ...d, data: { ...d.data, type: e.target.value } }))}>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="select">Select</MenuItem>
                  <MenuItem value="checkbox">Checkbox</MenuItem>
                </TextField>
                <TextField label="Default" value={paramDialog.data.default} onChange={e => setParamDialog(d => ({ ...d, data: { ...d.data, default: e.target.value } }))} />
                {paramDialog.data.type === 'select' && (
                  <TextField label="Options (comma separated)" value={paramDialog.data.options} onChange={e => setParamDialog(d => ({ ...d, data: { ...d.data, options: e.target.value } }))} />
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setParamDialog({ ...paramDialog, open: false })}>Cancel</Button>
                <Button onClick={handleParamSave} variant="contained">Save</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
        {tab === 2 && <PreviewBlock />}
        {tab === 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: fullscreen ? 1 : undefined }}>
            {editorDropdown}
            {actionRow}
            <Box sx={{ minHeight: fullscreen ? 'calc(100vh - 320px)' : 700, flex: fullscreen ? 1 : undefined, border: '1px solid #ccc', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
              {editor === 'monaco' ? (
                <MonacoEditor
                  height={fullscreen ? '100%' : '700px'}
                  defaultLanguage="javascript"
                  value={jsxCode}
                  onChange={v => setJsxCode(v)}
                  theme="vs-dark"
                  options={{ fontSize: 15 }}
                />
              ) : (
                <CodeMirror
                  value={jsxCode}
                  height={fullscreen ? '100%' : '700px'}
                  theme={material}
                  extensions={[javascript({ jsx: true })]}
                  onChange={value => setJsxCode(value)}
                />
              )}
            </Box>
            {actionRow}
            {aiResponse && (
              <Box sx={{ bgcolor: '#222', color: '#fff', p: 2, borderRadius: 2, minHeight: 80, mt: 1 }}>
                {aiResponse}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={handleSave} variant="contained" color="primary" disabled={saving}>Save</Button>
      </DialogActions>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

function BlockTemplatesTable({ categories }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [form, setForm] = useState({
    category_id: '',
    type: '',
    display_name: '',
    description: '',
    enabled: true,
    config_schema: '',
    ui_schema: '',
    component: '',
  });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selected, setSelected] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editBlockDialog, setEditBlockDialog] = useState({ open: false, template: null });

  useEffect(() => {
    fetch('/api/blocks/block_templates')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array, fallback to empty array if not
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch templates:', error);
        setTemplates([]);
        setLoading(false);
      });
  }, []);

  const handleOpen = (tpl) => {
    setEditTemplate(tpl);
    setForm(tpl ? {
      category_id: tpl.category_id,
      type: tpl.type,
      display_name: tpl.display_name,
      description: tpl.description,
      enabled: tpl.enabled,
      config_schema: JSON.stringify(tpl.config_schema, null, 2),
      ui_schema: tpl.ui_schema ? JSON.stringify(tpl.ui_schema, null, 2) : '',
      component: tpl.component,
    } : {
      category_id: '',
      type: '',
      display_name: '',
      description: '',
      enabled: true,
      config_schema: '',
      ui_schema: '',
      component: '',
    });
    setOpen(true);
  };
  const handleClose = () => { setOpen(false); setEditTemplate(null); };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleSave = () => {
    // Placeholder: implement POST/PUT
    handleClose();
  };
  const handleDelete = (tpl) => {
    // Placeholder: implement DELETE
    alert('Delete ' + tpl.display_name);
  };

  // Helper: get category object by id
  const getCategory = (id) => categories.find(c => c.id === Number(id));

  const handleBulkCreate = async (arr) => {
    setBulkOpen(false);
    let success = 0, fail = 0;
    for (const item of arr) {
      try {
        await fetch('/api/blocks/block_template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        success++;
      } catch {
        fail++;
      }
    }
    setSnackbar({ open: true, message: `Created ${success} templates${fail ? ', failed ' + fail : ''}`, severity: fail ? 'warning' : 'success' });
    // Optionally reload templates
    fetch('/api/blocks/block_templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to reload templates:', error);
        setTemplates([]);
        setLoading(false);
      });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelected(templates.map(tpl => tpl.id));
    else setSelected([]);
  };
  const handleSelect = (id) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const handleDeleteSelected = async () => {
    setConfirmDeleteOpen(false);
    let success = 0, fail = 0;
    for (const id of selected) {
      try {
        await fetch(`/api/blocks/block_template/${id}`, { method: 'DELETE' });
        success++;
      } catch {
        fail++;
      }
    }
    setSnackbar({ open: true, message: `Deleted ${success} templates${fail ? ', failed ' + fail : ''}`, severity: fail ? 'warning' : 'success' });
    setSelected([]);
    fetch('/api/blocks/block_templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to reload templates after delete:', error);
        setTemplates([]);
        setLoading(false);
      });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Tooltip title="Create a new template"><span><Button variant="contained" color="primary" onClick={() => handleOpen(null)}>Create Template</Button></span></Tooltip>
        <Tooltip title="Upload templates from a JSON file"><span><Button variant="contained" color="primary" onClick={() => setBulkOpen(true)}>Upload JSON</Button></span></Tooltip>
        <Tooltip title={selected.length ? `Download ${selected.length} selected templates as JSON` : 'Select templates to enable download'}>
          <span>
            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              disabled={selected.length === 0}
              onClick={() => downloadJsonFile(templates.filter(tpl => selected.includes(tpl.id)), selected.length === templates.length ? 'block_templates.json' : 'block_templates_selected.json')}
            >
              Download JSON
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={selected.length ? `Delete ${selected.length} selected templates` : 'Select templates to enable delete'}>
          <span>
            <Button
              variant="contained"
              color="primary"
              disabled={selected.length === 0}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete Selected
            </Button>
          </span>
        </Tooltip>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < templates.length}
                  checked={templates.length > 0 && selected.length === templates.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all templates' }}
                />
              </TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Icon</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Enabled</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map(tpl => {
              const cat = getCategory(tpl.category_id);
              return (
                <TableRow key={tpl.id} selected={selected.includes(tpl.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(tpl.id)}
                      onChange={() => handleSelect(tpl.id)}
                      inputProps={{ 'aria-label': `select template ${tpl.display_name}` }}
                    />
                  </TableCell>
                  <TableCell>{tpl.id}</TableCell>
                  <TableCell>{cat ? cat.name : ''}</TableCell>
                  <TableCell>{cat && cat.icon ? iconMap[cat.icon] : null}</TableCell>
                  <TableCell>{tpl.display_name}</TableCell>
                  <TableCell>{tpl.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={tpl.type === 'frontend' ? 'Frontend' : 'Backend'}
                      color={tpl.type === 'frontend' ? 'primary' : 'secondary'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{tpl.enabled ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => setEditBlockDialog({ open: true, template: tpl })}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(tpl)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Delete Selected Templates?</DialogTitle>
        <DialogContent>Are you sure you want to delete {selected.length} selected templates? This cannot be undone.</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSelected} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
      <BlockEditorDialog open={editBlockDialog.open} onClose={() => setEditBlockDialog({ open: false, template: null })} template={editBlockDialog.template} />
      <BulkCreateDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onBulkCreate={handleBulkCreate}
        label="Templates"
        example={`[
  { "category_id": 1, "type": "ocr_easyocr", "display_name": "OCR (EasyOCR)", "description": "Extract text from images or PDFs using EasyOCR.", "enabled": true, "config_schema": { "lang": { "type": "string", "default": "en" } }, "component": "OCRBlock" }
]`}
        dialogTitle="Upload Templates from JSON"
      />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default function BlocksPage() {
  const [tab, setTab] = React.useState(0);
  const [categories, setCategories] = React.useState([]);
  useEffect(() => {
    fetch('/api/blocks/block_categories')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array, fallback to empty array if not
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      });
  }, []);
  const handleChange = (event, newValue) => setTab(newValue);
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs value={tab} onChange={handleChange} aria-label="Blocks tabs">
        <Tab label="Categories" />
        <Tab label="Templates" />
        <Tab label="Workflows" />
        <Tab label="Executions" />
      </Tabs>
      <TabPanel value={tab} index={0}><BlockCategoriesTable /></TabPanel>
      <TabPanel value={tab} index={1}><BlockTemplatesTable categories={categories} /></TabPanel>
      <TabPanel value={tab} index={2}>Workflows (CRUD coming soon)</TabPanel>
      <TabPanel value={tab} index={3}>Block Executions (view coming soon)</TabPanel>
    </Box>
  );
} 