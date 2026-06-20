export default function RetiredJisuDreamPage() {
  return null;
}

export function getServerSideProps() {
  return {
    redirect: {
      destination: 'https://www.jisoodream.xyz/',
      permanent: false,
    },
  };
}
