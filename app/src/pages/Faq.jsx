import { Link } from 'react-router-dom';
import InfoPage from '../components/InfoPage';

const faqs = [
  ['Does it cost anything?', 'No. Give a Hand is free and no money changes hands. You swap help for help.'],
  ['How does a swap work?', 'Find a task you can help with and offer one of your own tasks in return. If they accept, you each do the other\'s task. When you\'ve finished, press "Mark as completed" and the owner confirms it, then you can leave each other a review.'],
  ['What are communities?', 'Groups of people who help each other, like your halls, course, street or a local group. Tasks you post to a community are only visible to its members. Anyone can create a community and becomes its admin.'],
  ['Can a swap be cancelled?', 'Yes. Either person can cancel an accepted swap from the Swap Requests page, and both tasks go back to being open. You can also withdraw an offer before it\'s answered.'],
  ['Who can see my phone number and email?', 'Only you. Other users see your name, city, picture, skills, rating and reviews.'],
  ['What if someone makes me uncomfortable?', 'Use the Report and Block buttons on their profile. Blocked people can\'t message you or send you swap offers.'],
  ['Can I stop the emails?', 'Yes. Untick "Email me about swap offers and messages" on your profile.'],
  ['How do I delete my account?', 'On your profile, use "Delete my account". It permanently removes your profile and everything you\'ve posted.'],
];

function Faq() {
  return (
    <InfoPage title="Frequently Asked Questions">
      {faqs.map(([question, answer]) => (
        <section key={question}>
          <h2>{question}</h2>
          <p>{answer}</p>
        </section>
      ))}
      <p className="pt-4">
        Still stuck? <Link to="/contact">Contact us</Link>.
      </p>
    </InfoPage>
  );
}

export default Faq;
