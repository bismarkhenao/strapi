/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import {
  // CompositeDecorator,
  ContentState,
  convertFromHTML,
  // convertToRaw,
  Editor,
  EditorState,
  getDefaultKeyBinding,
  Modifier,
  RichUtils,
} from 'draft-js';
import PropTypes from 'prop-types';
import { cloneDeep, isEmpty } from 'lodash';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';

import Controls from 'components/WysiwygInlineControls';
import Select from 'components/InputSelect';
import WysiwygBottomControls from 'components/WysiwygBottomControls';
import WysiwygEditor from 'components/WysiwygEditor';

import styles from './styles.scss';

const SELECT_OPTIONS = [
  { id: 'Add a title', value: '' },
  { id: 'Title H1', value: '# ' },
  { id: 'Title H2', value: '## ' },
  { id: 'Title H3', value: '### ' },
  { id: 'Title H4', value: '#### '},
  { id: 'Title H5', value: '##### ' },
  { id: 'Title H6', value: '###### ' },
];

// NOTE: I leave that as a reminder
const CONTROLS = [
  [
    {label: 'B', style: 'BOLD', handler: 'toggleInlineStyle' },
    {label: 'I', style: 'ITALIC', className: 'styleButtonItalic', handler: 'toggleInlineStyle' },
    {label: 'U', style: 'UNDERLINE', handler: 'toggleInlineStyle' },
    {label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hideLabel: true, handler: 'toggleBlockType' },
    {label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hideLabel: true, handler: 'toggleBlockType' },
  ],
  [
    {label: '<>', style: 'code-block', handler: 'toggleBlockType' },
    {label: 'quotes', style: 'blockquote', className: 'styleButtonBlockQuote', hideLabel: true, handler: 'toggleBlockType' },
  ],
];

const NEW_CONTROLS = [
  [
    {label: 'B', style: 'BOLD', handler: 'addEntity', text: '__text in bold__' },
    {label: 'I', style: 'ITALIC', className: 'styleButtonItalic', handler: 'addEntity', text: '*text in italic*' },
    {label: 'U', style: 'UNDERLINE', handler: 'addEntity', text: '<u>underlined text</u>' },
    {label: 'UL', style: 'unordered-list-item', className: 'styleButtonUL', hideLabel: true, handler: 'addEntity', text: '-' },
    {label: 'OL', style: 'ordered-list-item', className: 'styleButtonOL', hideLabel: true, handler: 'addEntity', text: '1.' },
  ],
];

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote':
      return styles.editorBlockquote;
    case 'code-block':
      return styles.editorCodeBlock;
    default: return null;
  }
}

/* eslint-disable  react/no-string-refs */
/* eslint-disable react/jsx-handler-names */
class Wysiwyg extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      isFocused: false,
      initialValue: '',
      headerValue: '',
      previewHTML: false,
      toggleFullScreen: false,
    };
    this.focus = () => {
      this.setState({ isFocused: true });
      return this.domEditor.focus();
    };
  }

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }

    if (!isEmpty(this.props.value)) {
      this.setInitialValue(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value && !this.state.hasInitialValue) {
      this.setInitialValue(nextProps);
    }

    // Handle reset props
    if (nextProps.value === this.state.initialValue && this.state.hasInitialValue) {
      this.setInitialValue(nextProps);
    }
  }

  addEntity = (text) => {
    console.log('text', text)
    const editorState = this.state.editorState;
    const currentContent = editorState.getCurrentContent();

    // Get the selected text
    const selection = editorState.getSelection();
    const anchorKey = selection.getAnchorKey();
    const currentContentBlock = currentContent.getBlockForKey(anchorKey);
    const start = selection.getStartOffset();
    const end = selection.getEndOffset();
    const selectedText = currentContentBlock.getText().slice(start, end);
    // Replace it with the value
    const textWithEntity = Modifier.replaceText(currentContent, selection, `${text} ${selectedText}`);

    this.setState({
      editorState: EditorState.push(editorState, textWithEntity, 'insert-characters'),
      headerValue: '',
    }, () => {
      this.focus();
    });
  }

  handleChangeSelect = ({ target }) => {
    this.setState({ headerValue: target.value });
    this.addEntity(target.value);
  }

  onChange = (editorState) => {
    this.setState({ editorState });
    this.props.onChange({ target: {
      value: editorState.getCurrentContent().getPlainText(),
      name: this.props.name,
      type: 'textarea',
    }});
  }

  mapKeyToEditorCommand = (e) => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(
        e,
        this.state.editorState,
        4, /* maxDepth */
      );
      if (newEditorState !== this.state.editorState) {
        this.onChange(newEditorState);
      }
      return;
    }
    return getDefaultKeyBinding(e);
  }

  toggleBlockType = (blockType) => {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  toggleInlineStyle = (inlineStyle) => {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  toggleFullScreen = (e) => {
    e.preventDefault();
    this.setState({
      toggleFullScreen: !this.state.toggleFullScreen,
    }, () => {
      this.focus();
    });
  }

  setInitialValue = (props) => {
    const contentState = ContentState.createFromText(props.value);
    let editorState = EditorState.createWithContent(contentState);

    // Get the cursor at the end
    editorState = EditorState.moveFocusToEnd(editorState);

    this.setState({ editorState, hasInitialValue: true, initialValue: props.value });
  }

  handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  componentDidCatch(error, info) {
    console.log('err', error);
    console.log('info', info);
  }

  previewHTML = () => {
    const blocksFromHTML = convertFromHTML(this.props.value);
    const contentState = ContentState.createFromBlockArray(blocksFromHTML);
    return EditorState.createWithContent(contentState);
  }

  render() {
    const { editorState } = this.state;
    console.log(this  )
    if (this.state.toggleFullScreen) {
      return (
        <div className={styles.fullscreenOverlay} onClick={this.toggleFullScreen}>
          <div
            className={cn(styles.editorWrapper, this.state.isFocused && styles.editorFocus)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ marginTop: '0' }}
          >
            <div className={styles.controlsContainer}>
              <div style={{ minWidth: '161px', marginLeft: '8px' }}>
                <Select
                  name="headerSelect"
                  onChange={this.handleChangeSelect}
                  value={this.state.headerValue}
                  selectOptions={SELECT_OPTIONS}
                />
              </div>
              {NEW_CONTROLS.map((value, key) => (
                <Controls
                  key={key}
                  buttons={value}
                  editorState={editorState}
                  handlers={{
                    addEntity: this.addEntity,
                    toggleBlockType: this.toggleBlockType,
                    toggleInlineStyle: this.toggleInlineStyle,
                  }}
                  onToggle={this.toggleInlineStyle}
                  onToggleBlock={this.toggleBlockType}
                  previewHTML={() => this.setState(prevState => ({ previewHTML: !prevState.previewHTML }))}
                />
              ))}
            </div>
            <div className={styles.editor} onClick={this.focus}>
              <WysiwygEditor
                blockStyleFn={getBlockStyle}
                editorState={editorState}
                handleKeyCommand={this.handleKeyCommand}
                keyBindingFn={this.mapKeyToEditorCommand}
                onBlur={() => this.setState({ isFocused: false })}
                onChange={this.onChange}
                placeholder={this.props.placeholder}
                setRef={(editor) => this.domEditor = editor}
                spellCheck
              />
            </div>
          </div>
          <div
            className={cn(styles.editorWrapper)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ marginTop: '0' }}
          >
            <div className={styles.previewControlsWrapper} onClick={this.toggleFullScreen}>
              <div><FormattedMessage id="components.WysiwygBottomControls.charactersIndicators" values={{ characters: 0 }} /></div>
              <div className={styles.wysiwygCollapse}>
                <FormattedMessage id="components.Wysiwyg.collapse" />
              </div>
            </div>
            <div className={styles.editor}>
              <WysiwygEditor
                // TODO handle preview
                editorState={EditorState.createEmpty()}
                onChange={() => {}}
                placeholder={this.props.placeholder}
                setRef={(dummyEditor) => this.dummyEditor = dummyEditor}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn(styles.editorWrapper, this.state.isFocused && styles.editorFocus)}>
        <div className={styles.controlsContainer}>
          <div style={{ minWidth: '161px', marginLeft: '8px' }}>
            <Select
              name="headerSelect"
              onChange={this.handleChangeSelect}
              value={this.state.headerValue}
              selectOptions={SELECT_OPTIONS}
            />
          </div>
          {NEW_CONTROLS.map((value, key) => (
            <Controls
              key={key}
              buttons={value}
              editorState={editorState}
              handlers={{
                addEntity: this.addEntity,
                toggleBlockType: this.toggleBlockType,
                toggleInlineStyle: this.toggleInlineStyle,
              }}
              onToggle={this.toggleInlineStyle}
              onToggleBlock={this.toggleBlockType}
              previewHTML={() => this.setState(prevState => ({ previewHTML: !prevState.previewHTML }))}
            />
          ))}
        </div>
        <div className={styles.editor} onClick={this.focus}>
          <WysiwygEditor
            blockStyleFn={getBlockStyle}
            editorState={editorState}
            handleKeyCommand={this.handleKeyCommand}
            keyBindingFn={this.mapKeyToEditorCommand}
            onBlur={() => this.setState({ isFocused: false })}
            onChange={this.onChange}
            placeholder={this.props.placeholder}
            setRef={(editor) => this.domEditor = editor}
            spellCheck
          />
          <input className={styles.editorInput} value="" tabIndex="-1" />
        </div>
        <WysiwygBottomControls onClick={this.toggleFullScreen} />
      </div>
    );
  }
}

Wysiwyg.defaultProps = {
  autoFocus: false,
  onChange: () => {},
  placeholder: '',
  value: '',
};

Wysiwyg.propTypes = {
  autoFocus: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default Wysiwyg;
