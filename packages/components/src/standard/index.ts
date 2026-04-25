import { STANDARD_CATALOG_ID } from '@a2ui/protocol';
import { defineCatalog } from '../catalog.js';

import { AudioPlayer } from './AudioPlayer.js';
import { Button } from './Button.js';
import { Card } from './Card.js';
import { CheckBox } from './CheckBox.js';
import { Column } from './Column.js';
import { DateTimeInput } from './DateTimeInput.js';
import { Divider } from './Divider.js';
import { Icon } from './Icon.js';
import { Image } from './Image.js';
import { List } from './List.js';
import { Modal } from './Modal.js';
import { MultipleChoice } from './MultipleChoice.js';
import { Row } from './Row.js';
import { Slider } from './Slider.js';
import { Tabs } from './Tabs.js';
import { Text } from './Text.js';
import { TextField } from './TextField.js';
import { Video } from './Video.js';

export const StandardCatalog = defineCatalog({
  catalogId: STANDARD_CATALOG_ID,
  components: {
    Text: Text as never,
    Image: Image as never,
    Icon: Icon as never,
    Video: Video as never,
    AudioPlayer: AudioPlayer as never,
    Row: Row as never,
    Column: Column as never,
    List: List as never,
    Card: Card as never,
    Tabs: Tabs as never,
    Divider: Divider as never,
    Modal: Modal as never,
    Button: Button as never,
    CheckBox: CheckBox as never,
    TextField: TextField as never,
    DateTimeInput: DateTimeInput as never,
    MultipleChoice: MultipleChoice as never,
    Slider: Slider as never,
  },
});

export {
  AudioPlayer,
  Button,
  Card,
  CheckBox,
  Column,
  DateTimeInput,
  Divider,
  Icon,
  Image,
  List,
  Modal,
  MultipleChoice,
  Row,
  Slider,
  Tabs,
  Text,
  TextField,
  Video,
};
