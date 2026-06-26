import { render, screen } from '@testing-library/react';
import { RegularGuideCard } from '../GuideShells';

describe('RegularGuideCard', () => {
  const mockGuideWithCover = {
    slug: 'test-guide',
    title: '测试攻略',
    excerpt: '这是一个测试攻略的摘要',
    coverUrl: '/uploads/guides/test/cover.png',
    source: 'tftacademy',
    updatedAt: '2026-06-24',
    publishedAt: '2026-06-24',
    readingMinutes: 5,
    tags: ['测试', '攻略'],
  };

  const mockGuideWithoutCover = {
    ...mockGuideWithCover,
    coverUrl: null,
  };

  test('renders image when coverUrl is provided', () => {
    render(<RegularGuideCard guide={mockGuideWithCover} />);

    const image = screen.getByAltText('测试攻略');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('/uploads/guides/test/cover.png'));
  });

  test('renders placeholder when coverUrl is null', () => {
    render(<RegularGuideCard guide={mockGuideWithoutCover} />);

    // 检查占位图容器存在
    const placeholder = screen.getByTestId('cover-placeholder');
    expect(placeholder).toBeInTheDocument();

    // 检查占位图包含 TFT 文字
    expect(screen.getByText('TFT')).toBeInTheDocument();
  });

  test('maintains aspect-video for both image and placeholder', () => {
    const { rerender } = render(<RegularGuideCard guide={mockGuideWithCover} />);

    // 有封面时应该有 aspect-video
    const imageContainer = screen.getByAltText('测试攻略').parentElement;
    expect(imageContainer).toHaveClass('aspect-video');

    // 无封面时占位图也应该有 aspect-video
    rerender(<RegularGuideCard guide={mockGuideWithoutCover} />);
    const placeholder = screen.getByTestId('cover-placeholder');
    expect(placeholder).toHaveClass('aspect-video');
  });
});
