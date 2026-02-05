import React, { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
  Modal,
  Badge,
  Spinner,
  useTheme,
} from '../index';
import styles from './ComponentShowcase.module.css';

export const ComponentShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.showcase}>
      <div className={styles.header}>
        <h1 className={styles.title}>UI Component Showcase</h1>
        <Button onClick={toggleTheme} variant="secondary" size="sm">
          Toggle Theme ({theme.mode})
        </Button>
      </div>

      <div className={styles.grid}>
        {/* Buttons Section */}
        <Card>
          <CardHeader title="Buttons" />
          <CardContent>
            <div className={styles.buttonGrid}>
              <Button variant="primary" size="sm">Primary Small</Button>
              <Button variant="primary" size="md">Primary Medium</Button>
              <Button variant="primary" size="lg">Primary Large</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" glow>Glow Effect</Button>
              <Button variant="primary" isLoading>Loading</Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <Card>
          <CardHeader title="Card Variants" />
          <CardContent>
            <div className={styles.cardGrid}>
              <Card variant="default" padding="sm">
                <CardContent>Default Card</CardContent>
              </Card>
              <Card variant="glass" padding="sm">
                <CardContent>Glass Card</CardContent>
              </Card>
              <Card variant="elevated" padding="sm">
                <CardContent>Elevated Card</CardContent>
              </Card>
              <Card variant="bordered" padding="sm" interactive>
                <CardContent>Interactive Card</CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Inputs Section */}
        <Card>
          <CardHeader title="Input Components" />
          <CardContent>
            <div className={styles.inputGrid}>
              <Input
                label="Default Input"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Input
                label="Input with Error"
                placeholder="Enter text..."
                error="This field is required"
              />
              <Input
                label="Input with Hint"
                placeholder="Enter text..."
                hint="This is a helpful hint"
              />
              <Input
                label="Loading Input"
                placeholder="Loading..."
                isLoading
              />
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card>
          <CardHeader title="Badges" />
          <CardContent>
            <div className={styles.badgeGrid}>
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="primary" rounded>Rounded</Badge>
              <Badge variant="success" dot />
              <Badge variant="danger" size="lg">Large</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Spinners Section */}
        <Card>
          <CardHeader title="Loading Spinners" />
          <CardContent>
            <div className={styles.spinnerGrid}>
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
              <Spinner variant="primary" />
              <Spinner variant="secondary" />
            </div>
          </CardContent>
        </Card>

        {/* Modal Section */}
        <Card>
          <CardHeader title="Modal Component" />
          <CardContent>
            <Button onClick={() => setIsModalOpen(true)}>
              Open Modal
            </Button>
          </CardContent>
        </Card>

        {/* Glass Effect Demo */}
        <Card variant="glass" glow>
          <CardHeader title="Glass Effect Card" />
          <CardContent>
            <p>This card demonstrates the glassmorphism effect with backdrop blur and transparency.</p>
          </CardContent>
          <CardFooter>
            <Badge variant="primary">Glass</Badge>
            <Badge variant="secondary">Modern</Badge>
          </CardFooter>
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        size="md"
      >
        <p>This is an example modal with our new design system.</p>
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Modal Input"
            placeholder="Type something..."
          />
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(false)}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
};