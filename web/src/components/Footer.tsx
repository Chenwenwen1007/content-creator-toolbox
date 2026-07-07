/**
 * 底部页脚组件
 * 展示版权声明等信息
 */
export function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-cream-200 bg-white/50">
      <div className="container xl:max-w-5xl">
        <div className="text-center">
          <p className="text-xs text-ink-400 leading-relaxed max-w-2xl mx-auto">
            本工具仅用于处理用户拥有合法版权的原创素材，禁止用于侵犯他人知识产权的用途，违规使用后果由用户自行承担。
          </p>
        </div>
      </div>
    </footer>
  );
}
