# Second Brain이란?

Second Brain(제2의 뇌)은 개인이 읽고, 배우고, 생각한 내용을 **외부 시스템**에 저장해 두었다가 필요할 때 꺼내 쓰는 지식 관리 방식이다.

## 핵심 원칙

1. **Capture(수집)**: 좋은 아이디어, 기사, PDF, 회의 메모를 한곳에 모은다.
2. **Organize(정리)**: 태그, 폴더, 링크로 나중에 찾기 쉽게 만든다.
3. **Distill(압축)**: 긴 글은 핵심만 요약해 둔다.
4. **Express(표현)**: 모은 지식을 글, 프로젝트, 결정에 활용한다.

## RAG와의 연결

RAG(Retrieval-Augmented Generation)는 Second Brain에 AI를 붙이는 방법이다.
문서를 벡터 DB에 저장해 두면, 질문할 때 관련 구절을 찾아 LLM이 답변한다.

## 추천 문서 형식

- Markdown 노트 (`.md`)
- PDF 자료
- TXT 메모

한국어와 영어가 섞여 있어도 OpenAI embedding으로 검색할 수 있다.
